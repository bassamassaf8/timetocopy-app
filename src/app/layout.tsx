import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TimeToCopy - Collaborative Clipboard Sharing",
  description:
    "Share your clipboard across devices in real time. Create a room, share the code, and collaborate instantly with text, links, images, and videos.",
  keywords: [
    "clipboard",
    "sharing",
    "collaboration",
    "real-time",
    "cross-device",
  ],
  authors: [{ name: "TimeToCopy Team" }],
  creator: "TimeToCopy",
  metadataBase: new URL("https://timetocopy.vercel.app"),
  openGraph: {
    title: "TimeToCopy - Collaborative Clipboard Sharing",
    description:
      "Share your clipboard across devices in real-time. Create a room, share the code, and collaborate instantly.",
    url: "https://timetocopy.vercel.app",
    siteName: "TimeToCopy",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TimeToCopy - Collaborative Clipboard Sharing",
    description:
      "Share your clipboard across devices in real-time. Create a room, share the code, and collaborate instantly.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📋</text></svg>"
        />
      </head>
      <body className={`${geist.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
