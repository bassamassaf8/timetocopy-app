# TimeToCopy - Collaborative Clipboard Sharing

A modern, real-time collaborative clipboard sharing application built with Next.js 15, TypeScript, and Tailwind CSS. Share text, links, images, and files across devices with automatic expiration and advanced features.

## ✨ Features

### 🔄 **Core Functionality**

- **Real-time Collaboration**: Share content instantly across multiple devices
- **1-Hour Auto-Expiration**: Rooms automatically expire for security
- **Auto-Content Detection**: Automatically detects text, links, images, and videos
- **6-Character Room Codes**: Easy-to-share room access codes

### 📌 **Content Management**

- **Pin Messages**: Pin important items to the top of the room
- **Folder Organization**: Create and organize content in custom folders
- **File Drag & Drop**: Drag files anywhere to upload (up to 100MB in Pro)
- **Clipboard Actions**: One-click copy to clipboard for any item

### 😀 **Interactive Features**

- **Emoji Reactions**: React to items with 8 different emojis (👍❤️😂😮😢😡🎉🔥)
- **Real-time Chat**: Built-in chat system for room participants
- **Participant Tracking**: See how many users are active in the room
- **Live Activity Indicators**: Visual feedback for room updates

### 🎨 **Design & Accessibility**

- **Dark/Light Theme**: Toggle between themes with system preference detection
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Beige Note-Taking Theme**: Clean, distraction-free color palette
- **Modern UI**: Beautiful gradients, shadows, and animations

### 📤 **Export Options**

- **Markdown Export**: Download room data as formatted markdown
- **JSON Export**: Download structured data for developers
- **Complete Data**: Includes items, reactions, chat messages, and metadata

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/timetocopy.git
cd timetocopy

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 How to Use

### Creating a Room

1. Click **"Create Room"** on the homepage
2. Share the 6-character room code with others
3. Start adding content immediately

### Joining a Room

1. Enter a room code in the **"Join Room"** field
2. Click **"Join Room"** to access the shared space

### Adding Content

- **Text**: Type or paste any text content
- **Links**: Paste URLs (automatically detected)
- **Images**: Paste image URLs or drag & drop image files
- **Files**: Drag any file onto the page to upload

### Managing Content

- **📌 Pin Items**: Click the pin icon to pin important content
- **😀 Add Reactions**: Click the smile icon to react with emojis
- **📁 Organize**: Create folders and categorize your content
- **📋 Copy**: One-click copy any item to your clipboard

### Chat & Collaboration

- **💬 Chat**: Click the message icon to open real-time chat
- **👥 Participants**: View active room participants
- **⏱️ Timer**: See remaining room time in the header

### Export Your Data

- **📄 Markdown**: Click "Export" for a formatted markdown file
- **📊 JSON**: Use `?format=json` for structured data export

## 🔧 API Endpoints

### Rooms

- `POST /api/rooms` - Create a new room
- `GET /api/rooms/[roomCode]` - Get room data
- `POST /api/rooms/[roomCode]` - Add items, chat, reactions

### Export

- `GET /api/rooms/[roomCode]?action=export` - Export as markdown
- `GET /api/rooms/[roomCode]?action=export&format=json` - Export as JSON

## 🎨 Customization

### Theme Colors

The app uses a stone/beige color palette:

- **Light Mode**: `stone-50` to `stone-900`
- **Dark Mode**: `stone-900` to `stone-50` (inverted)
- **Accent**: `stone-600` to `stone-800` for buttons

### Responsive Breakpoints

- **Mobile**: `< 640px` (sm)
- **Tablet**: `640px - 1024px` (md/lg)
- **Desktop**: `> 1024px` (xl)

## 🏗️ Architecture

### Frontend

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Hooks** for state management
- **Lucide React** for icons

### Backend

- **Next.js API Routes** for serverless functions
- **In-memory storage** (upgrade to Redis for production)
- **Real-time polling** every 2 seconds
- **Automatic cleanup** of expired rooms

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Deploy to Vercel
vercel --prod
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🛡️ Security Features

- **Automatic Expiration**: All rooms expire after 1 hour
- **No Persistent Storage**: Data is temporary by design
- **Client-side Validation**: Input sanitization and validation
- **CORS Protection**: API routes protected against unauthorized access

## 📈 TimeToCopy Pro

Upgrade for enhanced features:

- **24-hour room sessions** (vs 1-hour)
- **File uploads up to 100MB** (vs text only)
- **Advanced folder organization**
- **Room history and backups**
- **Priority support**

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js** team for the amazing framework
- **Tailwind CSS** for the utility-first CSS framework
- **Lucide** for the beautiful icon set
- **Vercel** for seamless deployment

---

**Built with ❤️ for seamless collaboration across devices**
