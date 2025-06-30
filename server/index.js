// server.js - Fixed CORS and content serving
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv").config();
const fetch = (...args) =>
  import("node-fetch").then((mod) => mod.default(...args));
// You may need to install this: npm install node-fetch

const { generateSignedUrl } = require("./r2ServiceWrapper");
const { createHLSStreams } = require("./FFMPEGService");

const BUCKET_NAME = process.env.BUCKET_NAME;

const app = express();
const PORT = 8000;

// Enhanced CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174",
    ], // Add your React dev server ports
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Range"],
    exposedHeaders: ["Content-Range", "Accept-Ranges", "Content-Length"],
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use("/output", express.static("output"));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mov|mkv|wmv|flv/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only video files are allowed!"));
    }
  },
});

// Upload endpoint
app.post("/upload", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    const videoId = path.basename(
      req.file.filename,
      path.extname(req.file.filename)
    );
    const outputDir = path.join("output", videoId);

    // Create output directory
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`Processing video: ${req.file.filename}`);
    console.log(`Output directory: ${outputDir}`);

    // Start HLS conversion
    const result = await createHLSStreams(req.file.path, outputDir, videoId);

    // Clean up original uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      videoId: result,
      masterPlaylist: `/${result}/master.m3u8`,
      message: "Video processed successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    res
      .status(500)
      .json({ error: "Video processing failed", details: error.message });
  }
});

// Helper function to fetch content from signed URL
async function fetchContentFromR2(objectKey, range = null) {
  try {
    const signedUrl = await generateSignedUrl(BUCKET_NAME, objectKey, 3600);

    const headers = {};
    if (range) {
      headers.Range = range;
    }

    const response = await fetch(signedUrl, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${objectKey}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    console.error(`Error fetching ${objectKey}:`, error);
    throw error;
  }
}

async function rewritePlaylistWithSignedUrls(
  m3u8Content,
  videoId,
  resolution,
  bucketName,
  generateSignedUrl
) {
  const lines = m3u8Content.split("\n");
  const rewrittenLines = [];

  for (const line of lines) {
    if (line.trim().endsWith(".ts")) {
      const segmentFileName = line.trim(); // e.g., segment_000.ts
      const objectKey = `videos/${videoId}/${resolution}/${segmentFileName}`;

      try {
        const signedUrl = await generateSignedUrl(bucketName, objectKey);
        rewrittenLines.push(signedUrl);
      } catch (error) {
        console.error(`Failed to sign segment ${segmentFileName}:`, error);
        throw error;
      }
    } else {
      // Keep non-segment lines (e.g. #EXTINF, #EXTM3U)
      rewrittenLines.push(line);
    }
  }

  return rewrittenLines.join("\n");
}


// Serve master playlist - fetch content and serve directly
app.get("/videos/:videoId/master.m3u8", async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const objectKey = `videos/${videoId}/master.m3u8`;

    const response = await fetchContentFromR2(objectKey);
    let content = await response.text();

    // // Replace playlist URLs to point to our server endpoints
    // content = content.replace(
    //   /(\d+p)\/playlist\.m3u8/g,
    //   `/${videoId}/$1/playlist.m3u8`
    // );

    res.set({
      "Content-Type": "application/vnd.apple.mpegurl",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Range",
    });

    res.send(content);
  } catch (error) {
    console.error("Failed to get master playlist:", error);
    res
      .status(500)
      .json({ error: `Failed to get master playlist: ${error.message}` });
  }
});

// Serve resolution-specific playlists - fetch content and serve directly
app.get("/videos/:videoId/:resolution/playlist.m3u8", async (req, res) => {
  try {
    const { videoId, resolution } = req.params;
    const objectKey = `videos/${videoId}/${resolution}/playlist.m3u8`;

    const response = await fetchContentFromR2(objectKey);
    let content = await response.text();

    const signedContent = await rewritePlaylistWithSignedUrls(content, videoId, resolution, BUCKET_NAME, generateSignedUrl)


    // Replace segment URLs to point to our server endpoints
    // content = content.replace(
    //   /segment_(\d+)\.ts/g,
    //   `/${videoId}/${resolution}/segment_$1.ts`
    // );

    res.set({
      "Content-Type": "application/vnd.apple.mpegurl",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Range",
    });

    res.send(signedContent);
  } catch (error) {
    console.error("Failed to get playlist:", error);
    res.status(500).json({ error: "Failed to get playlist" });
  }
});

// Serve video segments - proxy with range support
app.get("/videos/:videoId/:resolution/:segment", async (req, res) => {
  try {
    const { videoId, resolution, segment } = req.params;
    const objectKey = `videos/${videoId}/${resolution}/${segment}`;
    const range = req.headers.range;

    const response = await fetchContentFromR2(objectKey, range);

    // Copy headers from R2 response
    res.set({
      "Content-Type": "video/mp2t",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Range",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000", // Cache segments for 1 year
    });

    if (response.headers.get("content-range")) {
      res.set("Content-Range", response.headers.get("content-range"));
      res.status(206); // Partial Content
    }

    if (response.headers.get("content-length")) {
      res.set("Content-Length", response.headers.get("content-length"));
    }

    // Stream the content
    response.body.pipe(res);
  } catch (error) {
    console.error("Failed to serve segment:", error);
    res.status(500).json({ error: "Failed to serve segment" });
  }
});

// List all videos endpoint
app.get("/videos/all", (req, res) => {
  try {
    const outputDir = "output";
    if (!fs.existsSync(outputDir)) {
      return res.json({ videos: [] });
    }

    const videos = fs
      .readdirSync(outputDir)
      .filter((item) => fs.statSync(path.join(outputDir, item)).isDirectory())
      .map((videoId) => ({
        videoId,
        masterPlaylist: `/${videoId}/master.m3u8`,
      }));

    res.json({ videos });
  } catch (error) {
    res.status(500).json({ error: "Failed to list videos" });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "HLS Streaming Server is running",
    endpoints: {
      upload: "POST /upload",
      masterPlaylist: "GET /:videoId/master.m3u8",
      playlist: "GET /:videoId/:resolution/playlist.m3u8",
      segment: "GET /:videoId/:resolution/:segment",
      listVideos: "GET /videos/all",
    },
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`HLS Streaming Server running on http://localhost:${PORT}`);
  console.log("Upload videos to: POST /upload");
  console.log("View videos at: GET /:videoId/master.m3u8");
});

module.exports = app;
