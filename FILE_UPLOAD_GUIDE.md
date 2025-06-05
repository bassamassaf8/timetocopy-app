# File Upload Implementation Guide

Currently, TimeToCopy uses placeholder URLs for file uploads. To implement real file uploads, you have several options:

## Option 1: Cloudinary (Recommended for beginners)

1. Sign up for a free Cloudinary account at https://cloudinary.com
2. Install the Cloudinary SDK:

   ```bash
   npm install cloudinary
   ```

3. Add environment variables to `.env.local`:

   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. Create an API route at `src/app/api/upload/route.ts`:

   ```typescript
   import { v2 as cloudinary } from "cloudinary";
   import { NextRequest, NextResponse } from "next/server";

   cloudinary.config({
     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
     api_key: process.env.CLOUDINARY_API_KEY,
     api_secret: process.env.CLOUDINARY_API_SECRET,
   });

   export async function POST(request: NextRequest) {
     try {
       const formData = await request.formData();
       const file = formData.get("file") as File;

       if (!file) {
         return NextResponse.json(
           { error: "No file provided" },
           { status: 400 }
         );
       }

       const bytes = await file.arrayBuffer();
       const buffer = Buffer.from(bytes);

       const result = await new Promise((resolve, reject) => {
         cloudinary.uploader
           .upload_stream({ resource_type: "auto" }, (error, result) => {
             if (error) reject(error);
             else resolve(result);
           })
           .end(buffer);
       });

       return NextResponse.json({ url: result.secure_url });
     } catch (error) {
       return NextResponse.json({ error: "Upload failed" }, { status: 500 });
     }
   }
   ```

5. Update the `uploadFile` function in the room page:

   ```typescript
   const uploadFile = async (file: File) => {
     try {
       const formData = new FormData();
       formData.append("file", file);

       const uploadResponse = await fetch("/api/upload", {
         method: "POST",
         body: formData,
       });

       if (!uploadResponse.ok) {
         throw new Error("Upload failed");
       }

       const { url } = await uploadResponse.json();

       const response = await fetch(`/api/rooms/${roomCode}`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           action: "add_item",
           type: "file",
           content: url,
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
       }
     } catch (error) {
       console.error("Error uploading file:", error);
       alert(`Failed to upload ${file.name}. Please try again.`);
     }
   };
   ```

## Option 2: AWS S3

1. Install AWS SDK:

   ```bash
   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   ```

2. Set up environment variables and create upload API route similar to Cloudinary example.

## Option 3: Vercel Blob (if using Vercel)

1. Install Vercel Blob:

   ```bash
   npm install @vercel/blob
   ```

2. Follow Vercel's documentation for blob storage implementation.

## Current Placeholder Implementation

The current implementation creates local blob URLs using `URL.createObjectURL(file)`. This works for preview but files are not actually stored anywhere and will be lost when the page refreshes.

To test the current functionality:

1. Drag and drop files onto the room page
2. Files will appear in the upload queue
3. Click "Upload" to add them to the room
4. Files will show with preview images if they're image files

Note: The current implementation is for demonstration only and should not be used in production.
