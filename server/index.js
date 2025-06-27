const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
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
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
});

// Function to create HLS streams with different resolutions
function createHLSStreams(inputPath, outputDir, videoId) {
  return new Promise((resolve, reject) => {
    const resolutions = [
      { name: "480p", width: 854, height: 480, bitrate: "1000k" },
      { name: "720p", width: 1280, height: 720, bitrate: "2500k" },
      { name: "1080p", width: 1920, height: 1080, bitrate: "5000k" },
    ];

    const commands = [];
    const playlistEntries = [];

    // Create FFmpeg commands for each resolution
    resolutions.forEach((res) => {
      const outputPath = path.join(outputDir, `${res.name}`);
      fs.mkdirSync(outputPath, { recursive: true });

      const cmd = `ffmpeg -i "${inputPath}" \
        -vf "scale=${res.width}:${res.height}" \
        -c:v libx264 -b:v ${res.bitrate} -c:a aac -b:a 128k \
        -hls_time 10 -hls_list_size 0 -hls_segment_filename "${outputPath}/segment_%03d.ts" \
        "${outputPath}/playlist.m3u8"`;

      commands.push(cmd);

      // Add entry for master playlist
      playlistEntries.push({
        resolution: res,
        playlist: `${res.name}/playlist.m3u8`,
      });
    });

    // Execute all FFmpeg commands sequentially
    let currentIndex = 0;

    function executeNext() {
      if (currentIndex >= commands.length) {
        // All conversions complete, create master playlist
        createMasterPlaylist(outputDir, playlistEntries, videoId);
        resolve(videoId);
        return;
      }

      console.log(`Converting to ${resolutions[currentIndex].name}...`);
      exec(commands[currentIndex], (error, stdout, stderr) => {
        if (error) {
          console.error(
            `Error converting ${resolutions[currentIndex].name}:`,
            error
          );
          reject(error);
          return;
        }

        console.log(`${resolutions[currentIndex].name} conversion completed`);
        currentIndex++;
        executeNext();
      });
    }

    executeNext();
  });
}

// Function to create master playlist
function createMasterPlaylist(outputDir, playlistEntries, videoId) {
  let masterContent = "#EXTM3U\n#EXT-X-VERSION:3\n\n";

  playlistEntries.forEach((entry) => {
    const bandwidth = entry.resolution.bitrate.replace("k", "000");
    masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${entry.resolution.width}x${entry.resolution.height}\n`;
    masterContent += `${entry.playlist}\n\n`;
  });

  const masterPath = path.join(outputDir, "master.m3u8");
  fs.writeFileSync(masterPath, masterContent);
  console.log(`Master playlist created: ${masterPath}`);
}

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
      masterPlaylist: `/output/${result}/master.m3u8`,
      message: "Video processed successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    res
      .status(500)
      .json({ error: "Video processing failed", details: error.message });
  }
});

// Get video info endpoint
app.get("/video/:videoId", (req, res) => {
  const videoId = req.params.videoId;
  const outputDir = path.join("output", videoId);
  const masterPlaylist = path.join(outputDir, "master.m3u8");

  if (fs.existsSync(masterPlaylist)) {
    res.json({
      videoId: videoId,
      masterPlaylist: `/output/${videoId}/master.m3u8`,
      available: true,
    });
  } else {
    res.status(404).json({ error: "Video not found" });
  }
});

// List all videos endpoint
app.get("/videos", (req, res) => {
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
        masterPlaylist: `/output/${videoId}/master.m3u8`,
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
      getVideo: "GET /video/:videoId",
      listVideos: "GET /videos",
    },
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`HLS Streaming Server running on http://localhost:${PORT}`);
  console.log("Upload videos to: POST /upload");
  console.log("View videos at: GET /video/:videoId");
});

module.exports = app;
