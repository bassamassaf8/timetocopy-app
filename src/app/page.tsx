"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Users, Clock, Crown } from "lucide-react";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter();

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createRoom = async () => {
    setIsCreating(true);
    try {
      const code = generateRoomCode();
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: code }),
      });

      if (response.ok) {
        router.push(`/room/${code}`);
      }
    } catch (error) {
      console.error("Failed to create room:", error);
    }
    setIsCreating(false);
  };

  const joinRoom = async () => {
    if (!roomCode.trim()) return;

    setIsJoining(true);
    try {
      const response = await fetch(`/api/rooms/${roomCode.toUpperCase()}`);
      if (response.ok) {
        router.push(`/room/${roomCode.toUpperCase()}`);
      } else {
        alert("Room not found or expired");
      }
    } catch (error) {
      console.error("Failed to join room:", error);
      alert("Failed to join room");
    }
    setIsJoining(false);
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="px-4 sm:px-6 py-6 sm:py-8 pt-8 sm:pt-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 hidden sm:block">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-3">
            <div className="bg-stone-700 dark:bg-stone-600 p-2 rounded-xl">
              <Copy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-800 dark:text-stone-200">
              TimeToCopy
            </h1>
          </div>
          <div className="w-24 sm:w-32"></div> {/* Spacer for balance */}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-4 sm:py-6">
        <div className="w-full max-w-6xl">
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-12 items-center">
            {/* Left Side - Description */}
            <div className="lg:col-span-1 text-center lg:text-left order-2 lg:order-1">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-stone-800 dark:text-stone-200 mb-3 sm:mb-4 lg:mb-6 leading-tight">
                Share instantly across devices
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-stone-600 dark:text-stone-400 mb-4 sm:mb-6 lg:mb-8 leading-relaxed">
                Create secure rooms that automatically expire after one hour.
                Share text, links, images, and organize content in folders with
                real-time collaboration.
              </p>

              <div className="flex items-center justify-center lg:justify-start space-x-3 sm:space-x-4 lg:space-x-6 text-stone-600 dark:text-stone-400">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                  <span className="text-xs sm:text-sm font-medium">
                    1-hour sessions
                  </span>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                  <span className="text-xs sm:text-sm font-medium">
                    Real-time sync
                  </span>
                </div>
              </div>
            </div>

            {/* Center - Main Actions */}
            <div className="lg:col-span-1 space-y-3 sm:space-y-4 lg:space-y-6 order-1 lg:order-2">
              {/* Create Room */}
              <div className="bg-white dark:bg-stone-800 rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg border border-stone-200 dark:border-stone-700">
                <div className="text-center mb-3 sm:mb-4 lg:mb-6">
                  <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-stone-800 dark:text-stone-200 mb-1 sm:mb-2">
                    New Room
                  </h3>
                  <p className="text-xs sm:text-sm lg:text-base text-stone-600 dark:text-stone-400">
                    Start a collaboration session
                  </p>
                </div>
                <button
                  onClick={createRoom}
                  disabled={isCreating}
                  className="w-full bg-stone-700 hover:bg-stone-800 dark:bg-stone-600 dark:hover:bg-stone-700 text-white font-semibold py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 rounded-lg sm:rounded-xl lg:rounded-2xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg text-xs sm:text-sm lg:text-base"
                >
                  {isCreating ? "Creating..." : "Create Room"}
                </button>
              </div>

              {/* Join Room */}
              <div className="bg-white dark:bg-stone-800 rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg border border-stone-200 dark:border-stone-700">
                <div className="text-center mb-3 sm:mb-4 lg:mb-6">
                  <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-stone-800 dark:text-stone-200 mb-1 sm:mb-2">
                    Join Room
                  </h3>
                  <p className="text-xs sm:text-sm lg:text-base text-stone-600 dark:text-stone-400">
                    Enter a room code
                  </p>
                </div>
                <div className="space-y-2.5 sm:space-y-3 lg:space-y-4">
                  <input
                    type="text"
                    placeholder="Room code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 lg:py-3 border-2 border-stone-300 dark:border-stone-600 rounded-lg sm:rounded-xl lg:rounded-2xl focus:border-stone-500 dark:focus:border-stone-500 focus:outline-none transition-colors text-center text-sm sm:text-base lg:text-lg font-mono bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 placeholder-stone-500 dark:placeholder-stone-400"
                    maxLength={6}
                  />
                  <button
                    onClick={joinRoom}
                    disabled={!roomCode.trim() || isJoining}
                    className="w-full bg-stone-600 hover:bg-stone-700 dark:bg-stone-700 dark:hover:bg-stone-800 text-white font-semibold py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 rounded-lg sm:rounded-xl lg:rounded-2xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg text-xs sm:text-sm lg:text-base"
                  >
                    {isJoining ? "Joining..." : "Join Room"}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Side - Pro Features */}
            <div className="lg:col-span-1 order-3">
              <div className="bg-stone-700 dark:bg-stone-800 text-white rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg border border-stone-600 dark:border-stone-700">
                <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4 lg:mb-6">
                  <Crown className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold">
                    TimeToCopy Pro
                  </h3>
                </div>

                <div className="space-y-2 sm:space-y-3 lg:space-y-4 mb-3 sm:mb-4 lg:mb-6">
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <div className="bg-white/20 rounded-full w-2 h-2 mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p className="text-stone-100 text-xs sm:text-sm lg:text-base">
                      Extended 24-hour room sessions
                    </p>
                  </div>
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <div className="bg-white/20 rounded-full w-2 h-2 mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p className="text-stone-100 text-xs sm:text-sm lg:text-base">
                      Upload files up to 100MB
                    </p>
                  </div>
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <div className="bg-white/20 rounded-full w-2 h-2 mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p className="text-stone-100 text-xs sm:text-sm lg:text-base">
                      Advanced folder organization
                    </p>
                  </div>
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <div className="bg-white/20 rounded-full w-2 h-2 mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p className="text-stone-100 text-xs sm:text-sm lg:text-base">
                      Room history and backups
                    </p>
                  </div>
                </div>

                <button className="w-full bg-white text-stone-700 font-semibold py-2 sm:py-2.5 lg:py-3 px-3 sm:px-4 lg:px-6 rounded-lg sm:rounded-xl lg:rounded-2xl transition-all duration-200 hover:bg-stone-100 transform hover:scale-105 shadow-lg text-xs sm:text-sm lg:text-base">
                  Upgrade to Pro
                </button>

                <p className="text-center text-stone-200 text-xs sm:text-sm mt-2 sm:mt-3">
                  Starting at $5/month
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-3 sm:py-4 text-center text-stone-600 dark:text-stone-400 text-xs sm:text-sm">
        <p>Secure • Private • Temporary</p>
      </footer>
    </div>
  );
}
