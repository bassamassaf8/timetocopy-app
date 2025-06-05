import { NextRequest, NextResponse } from "next/server";
import {
  getRoom,
  addItemToRoom,
  addChatMessage,
  togglePinItem,
  addReaction,
  setRoomTheme,
  exportRoomData,
  createFolder,

} from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (!roomCode) {
      return NextResponse.json(
        { error: "Room code is required" },
        { status: 400 }
      );
    }

    if (action === "export") {
      const exportData = exportRoomData(roomCode);
      if (!exportData) {
        return NextResponse.json(
          { error: "Room not found or expired" },
          { status: 404 }
        );
      }

      const format = searchParams.get("format") || "markdown";

      if (format === "json") {
        const room = getRoom(roomCode);
        if (!room) {
          return NextResponse.json(
            { error: "Room not found or expired" },
            { status: 404 }
          );
        }

        const jsonData = {
          roomCode: room.id,
          created: room.createdAt.toISOString(),
          expires: room.expiresAt.toISOString(),
          participants: room.participants.size,
          items: room.items.map((item) => ({
            id: item.id,
            type: item.type,
            content: item.content,
            created: item.createdAt.toISOString(),
            userId: item.userId,
            isPinned: item.isPinned,
            reactions: item.reactions,
            fileName: item.fileName,
            fileSize: item.fileSize,
            fileType: item.fileType,
            folderId: item.folderId,
          })),
          chatMessages: room.chatMessages.map((msg) => ({
            id: msg.id,
            userId: msg.userId,
            userName: msg.userName,
            message: msg.message,
            created: msg.createdAt.toISOString(),
          })),
          exportedAt: new Date().toISOString(),
        };

        return new NextResponse(JSON.stringify(jsonData, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="room-${roomCode}-${
              new Date().toISOString().split("T")[0]
            }.json"`,
          },
        });
      }

      return new NextResponse(exportData, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="room-${roomCode}-${
            new Date().toISOString().split("T")[0]
          }.md"`,
        },
      });
    }

    const room = getRoom(roomCode);

    if (!room) {
      return NextResponse.json(
        { error: "Room not found or expired" },
        { status: 404 }
      );
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
      folders: room.folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        createdAt: folder.createdAt.toISOString(),
      })),
      chatMessages: room.chatMessages.map((msg) => ({
        id: msg.id,
        userId: msg.userId,
        userName: msg.userName,
        message: msg.message,
        createdAt: msg.createdAt.toISOString(),
      })),
      participantCount: room.participants.size,
      theme: room.theme,
      lastActivity: room.lastActivity.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching room:", error);
    return NextResponse.json(
      { error: "Failed to fetch room" },
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
    const body = await request.json();

    if (!roomCode) {
      return NextResponse.json(
        { error: "Room code is required" },
        { status: 400 }
      );
    }

    // Handle different actions
    switch (body.action) {
      case "add_item": {
        const {
          type,
          content,
          userId,
          fileName,
          fileSize,
          fileType,
          folderId,
        } = body;

        if (!type || !content || !userId) {
          return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
          );
        }

        const newItem = addItemToRoom(roomCode, type, content, userId, {
          fileName,
          fileSize,
          fileType,
          folderId,
        });

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

      case "add_chat": {
        const { userId, userName, message } = body;

        if (!userId || !userName || !message) {
          return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
          );
        }

        const chatMessage = addChatMessage(roomCode, userId, userName, message);

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

        const success = togglePinItem(roomCode, itemId);

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

        const success = addReaction(roomCode, itemId, emoji, userId);

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

        const success = setRoomTheme(roomCode, theme);

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

        const newFolder = createFolder(roomCode, folderName.trim());

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

        const newItem = addItemToRoom(roomCode, type, content, userId);

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
