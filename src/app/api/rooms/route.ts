import { NextRequest, NextResponse } from "next/server";
import { createRoom, getRoom } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const { roomCode } = await request.json();

    if (!roomCode) {
      return NextResponse.json(
        { error: "Room code is required" },
        { status: 400 }
      );
    }

    // Check if room already exists
    const existingRoom = getRoom(roomCode);
    if (existingRoom) {
      return NextResponse.json(
        { error: "Room already exists" },
        { status: 409 }
      );
    }

    // Create the room
    const room = createRoom(roomCode.toUpperCase());

    return NextResponse.json({
      success: true,
      roomCode: room.id,
      createdAt: room.createdAt.toISOString(),
      expiresAt: room.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Room API endpoint" });
}
