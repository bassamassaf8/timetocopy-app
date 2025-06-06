"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  Copy,
  Share2,
  Users,
  Clock,
  Plus,
  Link as LinkIcon,
  Image,
  Video,
  ExternalLink,
  Timer,
  FolderPlus,
  Folder,
  UserCircle,
  FileText,
  Pin,
  Download,
  MessageCircle,
  Send,
  Smile,
  Upload,
  X,
  File,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RoomItem {
  id: string;
  type: "text" | "link" | "image" | "video" | "file";
  content: string;
  createdAt: string;
  userId: string;
  folderId?: string;
  isPinned?: boolean;
  reactions?: { [emoji: string]: string[] };
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
}

interface RoomData {
  roomCode: string;
  createdAt: string;
  expiresAt: string;
  items: RoomItem[];
  participantCount: number;
  participants: { userId: string; userName: string; lastActivity: string }[];
  chatMessages: ChatMessage[];
  folders: Folder[];
  theme: "light" | "dark";
  lastActivity: string;
}

interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "🔥"];

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;

  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newContent, setNewContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [userId] = useState(
    () => `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
  const [userName, setUserName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("timetocopy-username") || "";
    }
    return "";
  });
  const [showNamePrompt, setShowNamePrompt] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("timetocopy-username");
    }
    return true;
  });
  const [tempUserName, setTempUserName] = useState("");
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // File upload with drag and drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  // Auto-detect content type
  const detectContentType = (content: string): RoomItem["type"] => {
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(content)) return "text";

    const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i;
    const videoExtensions = /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)(\?.*)?$/i;

    if (imageExtensions.test(content)) return "image";
    if (videoExtensions.test(content)) return "video";
    return "link";
  };

  const fetchRoomData = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${roomCode}`);
      if (response.ok) {
        const data = await response.json();
        setRoomData(data);
        setError(null);
      } else if (response.status === 404) {
        setError("Room not found or expired");
        setTimeout(() => router.push("/"), 3000);
      } else {
        setError("Failed to load room");
      }
    } catch (err) {
      console.error("Error fetching room data:", err);
      setError("Failed to connect to room");
    } finally {
      setLoading(false);
    }
  }, [roomCode, router]);

  useEffect(() => {
    fetchRoomData();

    // Poll for updates every 2 seconds
    pollInterval.current = setInterval(fetchRoomData, 2000);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [fetchRoomData]);

  useEffect(() => {
    if (roomData) {
      // Update folders from room data
      if (roomData.folders) {
        setFolders(roomData.folders);
      }

      const updateTimeLeft = () => {
        const now = new Date();
        const expiresAt = new Date(roomData.expiresAt);
        const diff = expiresAt.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeLeft("Expired");
          if (pollInterval.current) {
            clearInterval(pollInterval.current);
          }
        } else {
          const minutes = Math.floor(diff / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
        }
      };

      updateTimeLeft();
      const timeInterval = setInterval(updateTimeLeft, 1000);

      return () => clearInterval(timeInterval);
    }
  }, [roomData]);

  const addItem = async () => {
    if (!newContent.trim() || isAdding) return;

    setIsAdding(true);
    try {
      const contentType = detectContentType(newContent.trim());
      const response = await fetch(`/api/rooms/${roomCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_item",
          type: contentType,
          content: newContent.trim(),
          userId,
          folderId: selectedFolder,
        }),
      });

      if (response.ok) {
        setNewContent("");
        setShowAddForm(false);
        fetchRoomData();
      } else {
        alert("Failed to add item");
      }
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Failed to add item");
    }
    setIsAdding(false);
  };

  const uploadFile = async (file: File) => {
    try {
      // Upload file to Cloudinary
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const uploadResult = await uploadResponse.json();

      // Determine content type based on Cloudinary result
      let contentType: RoomItem["type"] = "file";
      if (uploadResult.resource_type === "image") {
        contentType = "image";
      } else if (uploadResult.resource_type === "video") {
        contentType = "video";
      }

      // Add the uploaded file to the room
      const response = await fetch(`/api/rooms/${roomCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_item",
          type: contentType,
          content: uploadResult.url,
          userId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          folderId: selectedFolder,
        }),
      });

      if (response.ok) {
        setUploadedFiles((prev) => prev.filter((f) => f !== file));
        fetchRoomData();
      } else {
        throw new Error("Failed to add item to room");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert(
        `Failed to upload ${file.name}. ${
          error instanceof Error ? error.message : "Please try again."
        }`
      );
    }
  };

  const sendChatMessage = async () => {
    if (!newChatMessage.trim()) return;

    try {
      const response = await fetch(`/api/rooms/${roomCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_chat",
          userId,
          userName,
          message: newChatMessage.trim(),
        }),
      });

      if (response.ok) {
        setNewChatMessage("");
        fetchRoomData();
      }
    } catch (error) {
      console.error("Error sending chat message:", error);
    }
  };

  const togglePin = async (itemId: string) => {
    try {
      const response = await fetch(`/api/rooms/${roomCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_pin",
          itemId,
        }),
      });

      if (response.ok) {
        fetchRoomData();
      }
    } catch (error) {
      console.error("Error toggling pin:", error);
    }
  };

  const addReaction = async (itemId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/rooms/${roomCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_reaction",
          itemId,
          emoji,
          userId,
        }),
      });

      if (response.ok) {
        fetchRoomData();
        setShowEmojiPicker(null);
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  const exportRoom = () => {
    window.open(
      `/api/rooms/${roomCode}?action=export&format=markdown`,
      "_blank"
    );
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch(`/api/rooms/${roomCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_folder",
          folderName: newFolderName.trim(),
        }),
      });

      if (response.ok) {
        setNewFolderName("");
        setShowNewFolderForm(false);
        fetchRoomData(); // Refresh to get the new folder
      } else {
        throw new Error("Failed to create folder");
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      alert("Failed to create folder. Please try again.");
    }
  };

  const copyToClipboard = async (
    content: string,
    event?: React.MouseEvent<HTMLButtonElement>
  ) => {
    try {
      await navigator.clipboard.writeText(content);
      if (event && event.currentTarget) {
        const button = event.currentTarget;
        const originalText = button.textContent;
        if (originalText) {
          button.textContent = "Copied!";
          setTimeout(() => {
            if (button && button.textContent === "Copied!") {
              button.textContent = originalText;
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const shareRoom = async () => {
    const shareUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(
        `Join my TimeToCopy room: ${shareUrl}`
      );
      alert("Room link copied to clipboard!");
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "link":
        return (
          <LinkIcon className="h-4 w-4 text-stone-600 dark:text-stone-400" />
        );
      case "image":
        return <Image className="h-4 w-4 text-stone-600 dark:text-stone-400" />;
      case "video":
        return <Video className="h-4 w-4 text-stone-600 dark:text-stone-400" />;
      case "file":
        return <File className="h-4 w-4 text-stone-600 dark:text-stone-400" />;
      default:
        return (
          <FileText className="h-4 w-4 text-stone-600 dark:text-stone-400" />
        );
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy room code:", error);
    }
  };

  const setUserNameAndStore = async (name: string) => {
    const finalName = name.trim() || `User ${Math.floor(Math.random() * 1000)}`;
    setUserName(finalName);
    if (typeof window !== "undefined") {
      localStorage.setItem("timetocopy-username", finalName);
    }

    // Join the room by registering as a participant
    try {
      await fetch(`/api/rooms/${roomCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join_room",
          userId,
          userName: finalName,
        }),
      });
    } catch (error) {
      console.error("Failed to join room:", error);
    }

    setShowNamePrompt(false);
  };

  if (showNamePrompt) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center transition-colors duration-300 px-4">
        <div className="bg-white dark:bg-stone-800 rounded-3xl shadow-2xl p-8 max-w-md w-full border border-stone-200 dark:border-stone-700">
          <div className="text-center mb-6">
            <div className="bg-stone-700 dark:bg-stone-600 p-3 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Copy className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200 mb-2">
              Welcome to Room {roomCode}
            </h2>
            <p className="text-stone-600 dark:text-stone-400">
              Please enter your name to join the collaboration
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your name"
              value={tempUserName}
              onChange={(e) => setTempUserName(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && setUserNameAndStore(tempUserName)
              }
              className="w-full px-4 py-3 border-2 border-stone-300 dark:border-stone-600 rounded-xl focus:border-stone-500 dark:focus:border-stone-400 focus:outline-none bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 placeholder-stone-500 dark:placeholder-stone-400"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setUserNameAndStore(tempUserName)}
                className="flex-1 bg-stone-700 hover:bg-stone-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
              >
                Join Room
              </button>
              <button
                onClick={() => setUserNameAndStore("")}
                className="px-6 py-3 border-2 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              >
                Anonymous
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-600 mx-auto mb-4"></div>
          <p className="text-stone-700 dark:text-stone-300">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200 mb-2">
            Room Error
          </h2>
          <p className="text-stone-700 dark:text-stone-300 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-stone-700 hover:bg-stone-800 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const filteredItems = selectedFolder
    ? roomData?.items.filter((item) => item.folderId === selectedFolder) || []
    : roomData?.items.filter((item) => !item.folderId) || [];

  const pinnedItems = filteredItems.filter((item) => item.isPinned);
  const regularItems = filteredItems.filter((item) => !item.isPinned);

  return (
    <div
      {...getRootProps()}
      className={`min-h-screen bg-stone-50 dark:bg-stone-900 transition-colors duration-300 ${
        isDragActive ? "bg-stone-100 dark:bg-stone-800" : ""
      }`}
    >
      <input {...getInputProps()} />

      {isDragActive && (
        <div className="fixed inset-0 bg-stone-500/20 dark:bg-stone-400/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-stone-800 rounded-3xl p-12 text-center shadow-2xl">
            <Upload className="h-16 w-16 text-stone-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-stone-800 dark:text-stone-200 mb-2">
              Drop files here
            </h3>
            <p className="text-stone-600 dark:text-stone-400">
              Files will be uploaded to the current folder
            </p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* Header */}
        <div className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 mb-6 sm:mb-8 border border-stone-200/50 dark:border-stone-700/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-stone-700 dark:bg-stone-600 p-2 sm:p-3 rounded-xl sm:rounded-2xl">
                <Copy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <button
                  onClick={copyRoomCode}
                  className="text-left hover:bg-stone-100 dark:hover:bg-stone-700 p-1 rounded-lg transition-colors group"
                >
                  <h1 className="text-xl sm:text-2xl font-bold text-stone-800 dark:text-stone-200 group-hover:text-stone-600 dark:group-hover:text-stone-400 transition-colors">
                    Room {roomCode}
                    {copySuccess && (
                      <span className="text-green-600 dark:text-green-400 text-sm ml-2">
                        ✓ Copied!
                      </span>
                    )}
                  </h1>
                  <p className="text-stone-600 dark:text-stone-400 text-sm group-hover:text-stone-500 dark:group-hover:text-stone-500">
                    Click to copy room code
                  </p>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowChat(!showChat)}
                className="flex items-center space-x-1 sm:space-x-2 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-colors text-sm"
              >
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Chat</span>
                <span className="bg-stone-300 dark:bg-stone-600 px-1.5 py-0.5 rounded-full text-xs">
                  {roomData?.chatMessages.length || 0}
                </span>
              </button>

              <button
                onClick={() => setShowParticipants(!showParticipants)}
                className="flex items-center space-x-1 sm:space-x-2 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-colors text-sm"
              >
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Users</span>
                <span className="bg-stone-300 dark:bg-stone-600 px-1.5 py-0.5 rounded-full text-xs">
                  {roomData?.participantCount || 0}
                </span>
              </button>

              <div className="flex items-center space-x-1 sm:space-x-2 text-stone-700 dark:text-stone-300 bg-stone-200 dark:bg-stone-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-sm">
                <Timer className="h-4 w-4 sm:h-5 sm:w-5" />
                <span
                  className={
                    timeLeft === "Expired" ? "text-red-600 font-semibold" : ""
                  }
                >
                  {timeLeft}
                </span>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => exportRoom()}
                  className="bg-stone-700 hover:bg-stone-800 dark:bg-stone-600 dark:hover:bg-stone-700 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all duration-200 flex items-center space-x-1 sm:space-x-2 shadow-lg text-sm"
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>

                <button
                  onClick={shareRoom}
                  className="bg-stone-600 hover:bg-stone-700 dark:bg-stone-700 dark:hover:bg-stone-800 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all duration-200 flex items-center space-x-1 sm:space-x-2 shadow-lg text-sm"
                >
                  <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Participants Panel */}
        {showParticipants && (
          <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
            <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-3">
              Active Participants ({roomData?.participantCount || 0})
            </h3>
            <div className="flex flex-wrap gap-2">
              {roomData?.participants && roomData.participants.length > 0 ? (
                roomData.participants.map((participant) => (
                  <div
                    key={participant.userId}
                    className="flex items-center space-x-2 bg-stone-200 dark:bg-stone-700 px-3 py-1 rounded-full"
                  >
                    <UserCircle className="h-4 w-4 text-stone-600 dark:text-stone-400" />
                    <span className="text-sm text-stone-800 dark:text-stone-200">
                      {participant.userName}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-stone-600 dark:text-stone-400">
                  No active participants
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Panel */}
        {showChat && (
          <div className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 mb-8 border border-stone-200/50 dark:border-stone-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                Chat
              </h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="h-64 overflow-y-auto mb-4 space-y-2">
              {roomData?.chatMessages.map((msg) => (
                <div key={msg.id} className="flex space-x-3">
                  <UserCircle className="h-6 w-6 text-stone-600 dark:text-stone-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
                        {msg.userName}
                      </span>
                      <span className="text-xs text-stone-600 dark:text-stone-400">
                        {formatDistanceToNow(new Date(msg.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-stone-700 dark:text-stone-300">
                      {msg.message}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="flex space-x-3">
              <input
                type="text"
                placeholder="Type a message..."
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                className="flex-1 px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-xl focus:border-stone-500 dark:focus:border-stone-400 focus:outline-none bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200"
              />
              <button
                onClick={sendChatMessage}
                disabled={!newChatMessage.trim()}
                className="bg-stone-600 hover:bg-stone-700 text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Uploaded Files Queue */}
        {uploadedFiles.length > 0 && (
          <div className="bg-stone-100 dark:bg-stone-800 rounded-3xl p-6 mb-8 border border-stone-200 dark:border-stone-700">
            <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-4">
              Files to Upload
            </h3>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-white dark:bg-stone-700 p-3 rounded-xl"
                >
                  <div className="flex items-center space-x-3">
                    <File className="h-5 w-5 text-stone-600 dark:text-stone-400" />
                    <div>
                      <p className="font-medium text-stone-800 dark:text-stone-200">
                        {file.name}
                      </p>
                      <p className="text-sm text-stone-600 dark:text-stone-400">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => uploadFile(file)}
                      className="bg-stone-600 hover:bg-stone-700 text-white px-3 py-1 rounded-lg text-sm"
                    >
                      Upload
                    </button>
                    <button
                      onClick={() =>
                        setUploadedFiles((prev) =>
                          prev.filter((_, i) => i !== index)
                        )
                      }
                      className="text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Folder Tabs */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-3 sm:mb-4">
            <button
              onClick={() => setSelectedFolder(null)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium transition-colors ${
                selectedFolder === null
                  ? "bg-stone-700 text-white shadow-lg"
                  : "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600"
              }`}
            >
              All Items
            </button>

            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium transition-colors ${
                  selectedFolder === folder.id
                    ? "bg-stone-700 text-white shadow-lg"
                    : "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600"
                }`}
              >
                <Folder className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                {folder.name}
              </button>
            ))}

            <button
              onClick={() => setShowNewFolderForm(!showNewFolderForm)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-stone-600 hover:bg-stone-700 text-white font-medium transition-colors shadow-lg text-sm sm:text-base"
            >
              <FolderPlus className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
              New Folder
            </button>
          </div>

          {showNewFolderForm && (
            <div className="bg-white dark:bg-stone-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-stone-200 dark:border-stone-700 shadow-lg">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <input
                  type="text"
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-stone-300 dark:border-stone-600 rounded-lg sm:rounded-xl focus:border-stone-500 dark:focus:border-stone-400 focus:outline-none bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 text-sm sm:text-base"
                />
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={createFolder}
                    disabled={!newFolderName.trim()}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-stone-700 hover:bg-stone-800 text-white rounded-lg sm:rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowNewFolderForm(false);
                      setNewFolderName("");
                    }}
                    className="px-4 sm:px-6 py-2 sm:py-3 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 rounded-lg sm:rounded-xl hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add Item Form */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full bg-stone-700 hover:bg-stone-800 dark:bg-stone-600 dark:hover:bg-stone-700 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl sm:rounded-3xl transition-all duration-200 flex items-center justify-center space-x-2 sm:space-x-3 shadow-xl text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Add New Item</span>
          </button>

          {showAddForm && (
            <div className="mt-4 sm:mt-6 bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 border border-stone-200/50 dark:border-stone-700/50">
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm sm:text-base font-medium text-stone-800 dark:text-stone-200 mb-2 sm:mb-3">
                    Content
                  </label>
                  <textarea
                    placeholder="Paste text, links, or drag files here..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-stone-300 dark:border-stone-600 rounded-xl sm:rounded-2xl focus:border-stone-500 dark:focus:border-stone-500 focus:outline-none resize-none bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 placeholder-stone-500 dark:placeholder-stone-400 text-sm sm:text-base"
                    rows={4}
                  />
                </div>

                {folders.length > 0 && (
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-stone-800 dark:text-stone-200 mb-2 sm:mb-3">
                      Folder
                    </label>
                    <select
                      value={selectedFolder || ""}
                      onChange={(e) =>
                        setSelectedFolder(e.target.value || null)
                      }
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-stone-300 dark:border-stone-600 rounded-xl sm:rounded-2xl focus:border-stone-500 dark:focus:border-stone-500 focus:outline-none bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 text-sm sm:text-base"
                    >
                      <option value="">Main folder</option>
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={addItem}
                    disabled={!newContent.trim() || isAdding}
                    className="flex-1 bg-stone-700 hover:bg-stone-800 dark:bg-stone-600 dark:hover:bg-stone-700 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-sm sm:text-base"
                  >
                    {isAdding ? "Adding..." : "Add Item"}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewContent("");
                    }}
                    className="px-4 sm:px-6 py-3 border-2 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 rounded-xl sm:rounded-2xl hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pinned Items */}
        {pinnedItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-stone-800 dark:text-stone-200 mb-4 flex items-center space-x-2">
              <Pin className="h-5 w-5" />
              <span>Pinned Items</span>
            </h2>
            <div className="space-y-4">
              {pinnedItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onCopy={copyToClipboard}
                  onPin={togglePin}
                  onReaction={addReaction}
                  showEmojiPicker={showEmojiPicker}
                  setShowEmojiPicker={setShowEmojiPicker}
                  getItemIcon={getItemIcon}
                  isValidUrl={isValidUrl}
                  formatFileSize={formatFileSize}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Items */}
        <div className="space-y-4">
          {regularItems.length === 0 && pinnedItems.length === 0 ? (
            <div className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm rounded-3xl shadow-xl p-12 border border-stone-200/50 dark:border-stone-700/50 text-center">
              <div className="bg-stone-200 dark:bg-stone-700 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Copy className="h-8 w-8 text-stone-600 dark:text-stone-400" />
              </div>
              <h3 className="text-xl font-semibold text-stone-800 dark:text-stone-200 mb-2">
                {selectedFolder ? "No items in this folder" : "No items yet"}
              </h3>
              <p className="text-stone-600 dark:text-stone-400">
                {selectedFolder
                  ? "This folder is empty"
                  : "Add your first item to start sharing!"}
              </p>
            </div>
          ) : (
            regularItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onCopy={copyToClipboard}
                onPin={togglePin}
                onReaction={addReaction}
                showEmojiPicker={showEmojiPicker}
                setShowEmojiPicker={setShowEmojiPicker}
                getItemIcon={getItemIcon}
                isValidUrl={isValidUrl}
                formatFileSize={formatFileSize}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Item Card Component
function ItemCard({
  item,
  onCopy,
  onPin,
  onReaction,
  showEmojiPicker,
  setShowEmojiPicker,
  getItemIcon,
  isValidUrl,
  formatFileSize,
}: {
  item: RoomItem;
  onCopy: (
    content: string,
    event?: React.MouseEvent<HTMLButtonElement>
  ) => void;
  onPin: (itemId: string) => void;
  onReaction: (itemId: string, emoji: string) => void;
  showEmojiPicker: string | null;
  setShowEmojiPicker: (itemId: string | null) => void;
  getItemIcon: (type: string) => React.ReactNode;
  isValidUrl: (string: string) => boolean;
  formatFileSize: (bytes: number) => string;
}) {
  return (
    <div className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 border border-stone-200/50 dark:border-stone-700/50">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex items-start space-x-3 sm:space-x-4 flex-1">
          <div className="bg-stone-200 dark:bg-stone-700 p-2 rounded-xl flex-shrink-0">
            {getItemIcon(item.type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2">
              <span className="text-xs sm:text-sm font-medium text-stone-700 dark:text-stone-300 capitalize bg-stone-100 dark:bg-stone-700 px-2 py-1 rounded-md">
                {item.type}
              </span>
              {item.fileName && (
                <>
                  <span className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 truncate max-w-32 sm:max-w-none">
                    {item.fileName}
                  </span>
                  {item.fileSize && (
                    <span className="text-xs text-stone-600 dark:text-stone-400">
                      ({formatFileSize(item.fileSize)})
                    </span>
                  )}
                </>
              )}
              <span className="text-xs text-stone-600 dark:text-stone-400">
                {formatDistanceToNow(new Date(item.createdAt), {
                  addSuffix: true,
                })}
              </span>
              {item.isPinned && (
                <Pin className="h-3 w-3 sm:h-4 sm:w-4 text-stone-600 dark:text-stone-400" />
              )}
            </div>

            <div className="break-all">
              {item.type === "link" && isValidUrl(item.content) ? (
                <div className="space-y-2">
                  <a
                    href={item.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 underline flex items-center space-x-1"
                  >
                    <span className="truncate">{item.content}</span>
                    <ExternalLink className="h-4 w-4 flex-shrink-0" />
                  </a>
                </div>
              ) : item.type === "image" && isValidUrl(item.content) ? (
                <div className="space-y-2">
                  <img
                    src={item.content}
                    alt="Shared image"
                    className="max-w-full sm:max-w-sm max-h-48 sm:max-h-64 rounded-lg shadow-md object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = "none";
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) {
                        fallback.style.display = "block";
                        fallback.textContent = item.fileName || item.content;
                      }
                    }}
                  />
                  <p className="text-stone-700 dark:text-stone-300 text-sm hidden">
                    {item.fileName || item.content}
                  </p>
                </div>
              ) : item.type === "video" && isValidUrl(item.content) ? (
                <div className="space-y-2">
                  <video
                    src={item.content}
                    controls
                    className="max-w-full sm:max-w-sm max-h-48 sm:max-h-64 rounded-lg shadow-md"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = "none";
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) {
                        fallback.style.display = "block";
                        fallback.textContent = item.fileName || item.content;
                      }
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                  <p className="text-stone-700 dark:text-stone-300 text-sm hidden">
                    {item.fileName || item.content}
                  </p>
                </div>
              ) : item.type === "file" ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 p-3 bg-stone-100 dark:bg-stone-700 rounded-lg">
                    <div className="bg-stone-200 dark:bg-stone-600 p-2 rounded-lg">
                      <File className="h-6 w-6 text-stone-600 dark:text-stone-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
                        {item.fileName || "Unknown file"}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-stone-600 dark:text-stone-400">
                        {item.fileSize && (
                          <span>{formatFileSize(item.fileSize)}</span>
                        )}
                        {item.fileType && (
                          <>
                            <span>•</span>
                            <span>{item.fileType}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {isValidUrl(item.content) && (
                      <a
                        href={item.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-stone-600 hover:bg-stone-700 dark:bg-stone-500 dark:hover:bg-stone-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download</span>
                      </a>
                    )}
                  </div>
                  {/* Show preview for image files even when marked as "file" type */}
                  {item.fileType?.startsWith("image/") &&
                    isValidUrl(item.content) && (
                      <img
                        src={item.content}
                        alt={item.fileName || "File preview"}
                        className="max-w-full sm:max-w-xs max-h-32 rounded-lg shadow-md object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                </div>
              ) : (
                <p className="text-stone-800 dark:text-stone-200 whitespace-pre-wrap">
                  {item.content}
                </p>
              )}
            </div>

            {/* Reactions */}
            {item.reactions && Object.keys(item.reactions).length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-2 mt-3">
                {Object.entries(item.reactions).map(([emoji, users]) => (
                  <button
                    key={emoji}
                    onClick={() => onReaction(item.id, emoji)}
                    className="flex items-center space-x-1 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 px-2 py-1 rounded-full text-xs sm:text-sm transition-colors"
                  >
                    <span className="text-sm sm:text-base">{emoji}</span>
                    <span className="text-stone-700 dark:text-stone-300 text-xs sm:text-sm font-medium">
                      {users.length}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-start sm:flex-col sm:items-end space-x-2 sm:space-x-0 sm:space-y-2 flex-shrink-0">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => onPin(item.id)}
              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-colors ${
                item.isPinned
                  ? "bg-stone-600 text-white"
                  : "bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-stone-600"
              }`}
            >
              <Pin className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>

            <div className="relative">
              <button
                onClick={() =>
                  setShowEmojiPicker(
                    showEmojiPicker === item.id ? null : item.id
                  )
                }
                className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
              >
                <Smile className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>

              {showEmojiPicker === item.id && (
                <div className="absolute top-full mt-2 right-0 sm:left-0 bg-white dark:bg-stone-800 rounded-xl shadow-lg border border-stone-200 dark:border-stone-600 p-3 sm:p-4 z-10 min-w-[200px] sm:min-w-[240px]">
                  <div className="grid grid-cols-4 gap-2 sm:gap-3">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => onReaction(item.id, emoji)}
                        className="p-2 sm:p-3 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 text-xl sm:text-2xl transition-colors flex items-center justify-center aspect-square"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={(e) => onCopy(item.content, e)}
            className="bg-stone-700 hover:bg-stone-800 dark:bg-stone-600 dark:hover:bg-stone-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all duration-200 flex items-center space-x-1 sm:space-x-2 flex-shrink-0 shadow-lg text-xs sm:text-sm"
          >
            <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Copy</span>
          </button>
        </div>
      </div>
    </div>
  );
}
