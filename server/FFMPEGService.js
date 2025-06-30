// FFMPEGService.js - Updated to generate proper playlist URLs
const { exec } = require("child_process");
const UploadQueue = require("./UploadQueue");
const path = require("path");
const fs = require("fs");

const BUCKET_NAME = process.env.BUCKET_NAME;
const uploadQueue = new UploadQueue(BUCKET_NAME);

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
        // All conversions complete, create master playlist and upload
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

        // // Update playlist to use server URLs instead of local paths
        // updatePlaylistUrls(
        //   path.join(outputDir, resolutions[currentIndex].name),
        //   videoId,
        //   resolutions[currentIndex].name
        // );

        // Upload the resolution folder
        uploadQueue.enqueueFolder(
          path.join(outputDir, resolutions[currentIndex].name),
          `${videoId}/${resolutions[currentIndex].name}`
        );

        currentIndex++;
        executeNext();
      });
    }

    executeNext();
  });
}

// Function to update playlist URLs to point to server endpoints
function updatePlaylistUrls(resolutionDir, videoId, resolution) {
  const playlistPath = path.join(resolutionDir, "playlist.m3u8");
  
  if (fs.existsSync(playlistPath)) {
    let content = fs.readFileSync(playlistPath, "utf8");
    
    // Replace segment filenames with server URLs
    content = content.replace(
      /segment_(\d+)\.ts/g,
      // `/${videoId}/segment_$1.ts`
      `${videoId}/${resolution}/segment_$1.ts`
    );
    
    fs.writeFileSync(playlistPath, content);
    console.log(`Updated playlist URLs for ${resolution}`);
  }
}

// Function to create master playlist
function createMasterPlaylist(outputDir, playlistEntries, videoId) {
  let masterContent = "#EXTM3U\n#EXT-X-VERSION:3\n\n";

  playlistEntries.forEach((entry) => {
    const bandwidth = entry.resolution.bitrate.replace("k", "000");
    masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${entry.resolution.width}x${entry.resolution.height}\n`;
    // Update to use server endpoint URLs
    // masterContent += `${videoId}/${entry.resolution.name}/playlist.m3u8\n\n`;
    // masterContent += `${videoId}/playlist.m3u8\n\n`;
    masterContent += `${entry.resolution.name}/playlist.m3u8\n\n`;
  });

  const masterPath = path.join(outputDir, "master.m3u8");
  fs.writeFileSync(masterPath, masterContent);

  // Upload master playlist
  uploadQueue.enqueueFile(masterPath, `${videoId}/master.m3u8`);
  console.log(`Master playlist created: ${masterPath}`);
}

module.exports = {
  createHLSStreams,
  createMasterPlaylist,
};