import { NextRequest, NextResponse } from "next/server";
import {
  getRoom,
  addItemToRoom,
  addChatMessage,
  togglePinItem,
  addReaction,
  setRoomTheme,
  createFolder,
  addParticipant,
} from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const room = getRoom(roomCode.toUpperCase());

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Return room data without sensitive information
    return NextResponse.json({
      roomCode: room.id,
      createdAt: room.createdAt.toISOString(),
      expiresAt: room.expiresAt.toISOString(),
      items: room.items.map((item) => ({
        id: item.id,
        type: item.type,
        content: item.content,
        createdAt: item.createdAt.toISOString(),
        userId: item.userId,
        folderId: item.folderId,
        isPinned: item.isPinned,
        reactions: item.reactions,
        fileName: item.fileName,
        fileSize: item.fileSize,
        fileType: item.fileType,
      })),
      participantCount: room.participants.size,
      participants: Array.from(room.participants.values()).map((p) => ({
        userId: p.userId,
        userName: p.userName,
        lastActivity: p.lastActivity.toISOString(),
      })),
      chatMessages: room.chatMessages.map((msg) => ({
        id: msg.id,
        userId: msg.userId,
        userName: msg.userName,
        message: msg.message,
        createdAt: msg.createdAt.toISOString(),
      })),
      folders: room.folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        createdAt: folder.createdAt,
      })),
      theme: "dark",
      lastActivity: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const roomCodeUpper = roomCode.toUpperCase();
    const room = getRoom(roomCodeUpper);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "join_room": {
        const { userId: joinUserId, userName: joinUserName } = body;
        const joinSuccess = addParticipant(
          roomCodeUpper,
          joinUserId,
          joinUserName
        );

        if (joinSuccess) {
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json(
            { error: "Failed to join room" },
            { status: 500 }
          );
        }
      }

      case "add_item": {
        const {
          type,
          content,
          userId,
          folderId,
          fileName,
          fileSize,
          fileType,
        } = body;
        const success = addItemToRoom(roomCodeUpper, type, content, userId, {
          folderId,
          fileName,
          fileSize,
          fileType,
        });

        if (success) {
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json(
            { error: "Failed to add item" },
            { status: 500 }
          );
        }
      }

      case "add_chat": {
        const { userId, userName, message } = body;

        if (!userId || !userName || !message) {
          return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
          );
        }

        const chatMessage = addChatMessage(
          roomCodeUpper,
          userId,
          userName,
          message
        );

        if (!chatMessage) {
          return NextResponse.json(
            { error: "Room not found or expired" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: {
            ...chatMessage,
            createdAt: chatMessage.createdAt.toISOString(),
          },
        });
      }

      case "toggle_pin": {
        const { itemId } = body;

        if (!itemId) {
          return NextResponse.json(
            { error: "Item ID is required" },
            { status: 400 }
          );
        }

        const success = togglePinItem(roomCodeUpper, itemId);

        if (!success) {
          return NextResponse.json(
            { error: "Room or item not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({ success: true });
      }

      case "add_reaction": {
        const { itemId, emoji, userId } = body;

        if (!itemId || !emoji || !userId) {
          return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
          );
        }

        const success = addReaction(roomCodeUpper, itemId, emoji, userId);

        if (!success) {
          return NextResponse.json(
            { error: "Room or item not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({ success: true });
      }

      case "set_theme": {
        const { theme } = body;

        if (!theme || !["light", "dark"].includes(theme)) {
          return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
        }

        const success = setRoomTheme(roomCodeUpper, theme);

        if (!success) {
          return NextResponse.json(
            { error: "Room not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({ success: true });
      }

      case "create_folder": {
        const { folderName } = body;

        if (!folderName || !folderName.trim()) {
          return NextResponse.json(
            { error: "Folder name is required" },
            { status: 400 }
          );
        }

        const newFolder = createFolder(roomCodeUpper, folderName.trim());

        if (!newFolder) {
          return NextResponse.json(
            { error: "Room not found or expired" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          folder: {
            ...newFolder,
            createdAt: newFolder.createdAt.toISOString(),
          },
        });
      }

      default:
        // Legacy support for old format
        const { type, content, userId } = body;

        if (!type || !content || !userId) {
          return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
          );
        }

        const newItem = addItemToRoom(roomCodeUpper, type, content, userId);

        if (!newItem) {
          return NextResponse.json(
            { error: "Room not found or expired" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          item: {
            ...newItem,
            createdAt: newItem.createdAt.toISOString(),
          },
        });
    }
  } catch (error) {
    console.error("Error handling room action:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
