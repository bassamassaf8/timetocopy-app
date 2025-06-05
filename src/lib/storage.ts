export interface RoomItem {
  id: string;
  type: "text" | "link" | "image" | "video" | "file";
  content: string;
  createdAt: Date;
  userId: string;
  folderId?: string;
  isPinned?: boolean;
  reactions?: { [emoji: string]: string[] }; // emoji -> array of userIds
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: Date;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: Date;
}

export interface Room {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  items: RoomItem[];
  participants: Set<string>;
  chatMessages: ChatMessage[];
  folders: Folder[];
  theme: "light" | "dark";
  lastActivity: Date;
}

// ⚠️  PRODUCTION WARNING ⚠️
// This uses in-memory storage which is NOT suitable for production!
// Data will be lost on server restart. For production, use:
// - Redis for fast temporary storage
// - PostgreSQL/MongoDB for persistent storage
// - Upstash Redis (free tier available)
// - PlanetScale MySQL
// - Supabase PostgreSQL

export const rooms = new Map<string, Room>();

// Enhanced room expiration time based on environment
const ROOM_EXPIRATION_MS =
  process.env.NODE_ENV === "production"
    ? parseInt(process.env.ROOM_EXPIRATION_HOURS || "1") * 60 * 60 * 1000 // Default 1 hour
    : 60 * 60 * 1000; // 1 hour for development

// Clean up expired rooms every 5 minutes
if (typeof window === "undefined") {
  const cleanupInterval = setInterval(() => {
    const now = new Date();
    let cleanedCount = 0;

    for (const [roomId, room] of rooms.entries()) {
      if (now > room.expiresAt) {
        rooms.delete(roomId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(
        `[${new Date().toISOString()}] Cleaned up ${cleanedCount} expired rooms. Active rooms: ${
          rooms.size
        }`
      );
    }
  }, 5 * 60 * 1000);

  // Log storage warning in production
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "⚠️  WARNING: Using in-memory storage in production! Data will be lost on restart."
    );
    console.warn("   For production use, implement Redis or database storage.");
  }

  // Cleanup function for graceful shutdown
  process.on("SIGTERM", () => {
    console.log("Cleaning up resources...");
    clearInterval(cleanupInterval);
  });
}

export function createRoom(roomCode: string): Room {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ROOM_EXPIRATION_MS);

  const room: Room = {
    id: roomCode.toUpperCase(),
    createdAt: now,
    expiresAt,
    items: [],
    participants: new Set<string>(),
    chatMessages: [],
    folders: [],
    theme: "dark", // Default to dark theme
    lastActivity: now,
  };

  rooms.set(roomCode.toUpperCase(), room);

  // Log room creation in production for monitoring
  if (process.env.NODE_ENV === "production") {
    console.log(
      `[${new Date().toISOString()}] Room created: ${roomCode.toUpperCase()}, expires: ${expiresAt.toISOString()}`
    );
  }

  return room;
}

export function getRoom(roomCode: string): Room | null {
  const room = rooms.get(roomCode.toUpperCase());

  if (!room) {
    return null;
  }

  // Check if room has expired
  const now = new Date();
  if (now > room.expiresAt) {
    rooms.delete(roomCode.toUpperCase());
    return null;
  }

  return room;
}

export function addItemToRoom(
  roomCode: string,
  type: RoomItem["type"],
  content: string,
  userId: string,
  options?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    folderId?: string;
  }
): RoomItem | null {
  const room = getRoom(roomCode);

  if (!room) {
    return null;
  }

  const newItem: RoomItem = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    content,
    createdAt: new Date(),
    userId,
    folderId: options?.folderId,
    isPinned: false,
    reactions: {},
    fileName: options?.fileName,
    fileSize: options?.fileSize,
    fileType: options?.fileType,
  };

  room.items.push(newItem);
  room.participants.add(userId);
  room.lastActivity = new Date();

  return newItem;
}

export function addChatMessage(
  roomCode: string,
  userId: string,
  userName: string,
  message: string
): ChatMessage | null {
  const room = getRoom(roomCode);

  if (!room) {
    return null;
  }

  const chatMessage: ChatMessage = {
    id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    userName,
    message,
    createdAt: new Date(),
  };

  room.chatMessages.push(chatMessage);
  room.lastActivity = new Date();

  return chatMessage;
}

export function togglePinItem(roomCode: string, itemId: string): boolean {
  const room = getRoom(roomCode);

  if (!room) {
    return false;
  }

  const item = room.items.find((item) => item.id === itemId);
  if (item) {
    item.isPinned = !item.isPinned;
    room.lastActivity = new Date();
    return true;
  }

  return false;
}

export function addReaction(
  roomCode: string,
  itemId: string,
  emoji: string,
  userId: string
): boolean {
  const room = getRoom(roomCode);

  if (!room) {
    return false;
  }

  const item = room.items.find((item) => item.id === itemId);
  if (item) {
    if (!item.reactions) {
      item.reactions = {};
    }
    if (!item.reactions[emoji]) {
      item.reactions[emoji] = [];
    }

    // Toggle reaction
    const userIndex = item.reactions[emoji].indexOf(userId);
    if (userIndex > -1) {
      item.reactions[emoji].splice(userIndex, 1);
      if (item.reactions[emoji].length === 0) {
        delete item.reactions[emoji];
      }
    } else {
      item.reactions[emoji].push(userId);
    }

    room.lastActivity = new Date();
    return true;
  }

  return false;
}

export function setRoomTheme(
  roomCode: string,
  theme: "light" | "dark"
): boolean {
  const room = getRoom(roomCode);

  if (!room) {
    return false;
  }

  room.theme = theme;
  room.lastActivity = new Date();
  return true;
}

export function exportRoomData(roomCode: string): string | null {
  const room = getRoom(roomCode);

  if (!room) {
    return null;
  }

  const markdown = `# TimeToCopy Room ${roomCode}

**Created:** ${room.createdAt.toLocaleString()}
**Participants:** ${room.participants.size}

## Pinned Items
${
  room.items
    .filter((item) => item.isPinned)
    .map(
      (item) =>
        `- **${item.type.toUpperCase()}** (${item.createdAt.toLocaleString()}): ${
          item.content
        }`
    )
    .join("\n") || "No pinned items"
}

## All Items
${room.items
  .map(
    (item) =>
      `- ${
        item.isPinned ? "📌 " : ""
      }**${item.type.toUpperCase()}** (${item.createdAt.toLocaleString()}): ${
        item.content
      }${
        item.reactions && Object.keys(item.reactions).length > 0
          ? ` | Reactions: ${Object.entries(item.reactions)
              .map(([emoji, users]) => `${emoji}${users.length}`)
              .join(" ")}`
          : ""
      }`
  )
  .join("\n")}

## Chat Messages
${
  room.chatMessages
    .map(
      (msg) =>
        `**${msg.userName}** (${msg.createdAt.toLocaleString()}): ${
          msg.message
        }`
    )
    .join("\n") || "No chat messages"
}

---
*Exported from TimeToCopy on ${new Date().toLocaleString()}*
`;

  return markdown;
}

export function createFolder(
  roomCode: string,
  folderName: string
): Folder | null {
  const room = getRoom(roomCode);

  if (!room) {
    return null;
  }

  const newFolder: Folder = {
    id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: folderName,
    createdAt: new Date(),
  };

  room.folders.push(newFolder);
  room.lastActivity = new Date();

  return newFolder;
}

export function getFolders(roomCode: string): Folder[] {
  const room = getRoom(roomCode);

  if (!room) {
    return [];
  }

  return room.folders;
}
