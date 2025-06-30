import React, { useEffect, useRef, useState, useMemo } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import VideoJS from "./VideoJS";
import "videojs-contrib-quality-levels";

export default function VideoPlayer({ videoId, src }) {
  const playerRef = useRef(null);
  const [qualityOptions, setQualityOptions] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState("auto");
  const qualityInitializedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Simplified - directly use the server endpoint
  const masterPlaylistUrl = `http://localhost:8000/videos/${videoId}/master.m3u8`;

  const videoJsOptions = useMemo(
    () => ({
      autoplay: false, // Better UX - let user decide when to play
      controls: true,
      responsive: true,
      fluid: true,
      preload: "metadata", // Only load metadata initially
      sources: [
        {
          src: masterPlaylistUrl,
          type: "application/x-mpegURL",
        },
      ],
      html5: {
        vhs: {
          overrideNative: true, // Use video.js HLS implementation
          withCredentials: false,
        },
        nativeVideoTracks: false,
        nativeAudioTracks: false,
        nativeTextTracks: false,
      },
      // Add error handling
      techOrder: ["html5"],
    }),
    [masterPlaylistUrl]
  );

  const handlePlayerReady = (player) => {
    playerRef.current = player;
    setIsLoading(false);

    const qualityLevels = player.qualityLevels();

    const updateQualityListOnce = () => {
      if (qualityInitializedRef.current || qualityLevels.length === 0) return;

      const levels = [];

      for (let i = 0; i < qualityLevels.length; i++) {
        const level = qualityLevels[i];
        levels.push({
          label: `${level.height}p`,
          height: level.height,
        });
      }

      const uniqueSorted = Array.from(
        new Map(levels.map((item) => [item.height, item])).values()
      ).sort((a, b) => b.height - a.height);

      setQualityOptions(uniqueSorted);
      qualityInitializedRef.current = true;
      console.log("Quality levels loaded:", uniqueSorted);
    };

    // Enhanced event handling
    player.on("loadedmetadata", () => {
      console.log("Video metadata loaded");
      setTimeout(updateQualityListOnce, 500);
    });

    player.on("canplay", () => {
      console.log("Video can start playing");
      setError(null);
    });

    player.on("waiting", () => {
      console.log("Player is waiting for data");
    });

    player.on("error", (e) => {
      const error = player.error();
      console.error("Video.js error:", error);
      setError(`Video error: ${error?.message || "Unknown error"}`);
    });

    player.on("dispose", () => {
      console.log("Player will dispose");
    });

    // HLS-specific events
    player.tech().on("usage", (event) => {
      console.log("HLS usage event:", event);
    });

    // Listen for quality level changes
    qualityLevels.on("change", () => {
      console.log("Quality level changed");
    });
  };

  const handleQualityChange = (value) => {
    const player = playerRef.current;
    console.log("handleQualityChange", value);
    if (!player) return;

    const qualityLevels = player.qualityLevels();

    if (value === "auto") {
      // Enable all quality levels for adaptive streaming
      for (let i = 0; i < qualityLevels.length; i++) {
        qualityLevels[i].enabled = true;
      }
      console.log("Enabled adaptive streaming");
    } else {
      const targetHeight = parseInt(value);

      // Disable all levels except selected
      for (let i = 0; i < qualityLevels.length; i++) {
        const level = qualityLevels[i];
        level.enabled = level.height === targetHeight;
        if (level.enabled) {
          console.log(`Enabled quality level: ${level.height}p`);
        }
      }
    }

    setSelectedQuality(value);
  };

  // Error boundary for the component
  useEffect(() => {
    if (error) {
      console.error("VideoPlayer error:", error);
    }
  }, [error]);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: "10px" }}>
        <h3>Video Player - {videoId}</h3>
        {isLoading && <p>Loading video...</p>}
        {error && (
          <div
            style={{
              color: "red",
              background: "#fee",
              padding: "10px",
              borderRadius: "4px",
              marginBottom: "10px",
            }}
          >
            {error}
          </div>
        )}
      </div>

      <VideoJS options={videoJsOptions} onReady={handlePlayerReady} />

      {qualityOptions.length > 0 && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px",
            background: "#f5f5f5",
            borderRadius: "4px",
          }}
        >
          <label htmlFor="quality-select" style={{ marginRight: "10px" }}>
            Select Quality:
          </label>
          <select
            id="quality-select"
            value={selectedQuality}
            onChange={(e) => handleQualityChange(e.target.value)}
            style={{
              padding: "5px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          >
            <option value="auto">Auto (Adaptive)</option>
            {qualityOptions.map((q) => (
              <option key={q.height} value={q.height}>
                {q.label}
              </option>
            ))}
          </select>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
            Current:{" "}
            {selectedQuality === "auto"
              ? "Adaptive Streaming"
              : `${selectedQuality}p`}
          </div>
        </div>
      )}

      {/* Debug info */}
      <div
        style={{
          fontSize: "12px",
          color: "#666",
          marginTop: "10px",
          padding: "10px",
          background: "#f9f9f9",
          borderRadius: "4px",
        }}
      >
        <strong>Debug Info:</strong>
        <br />
        Video ID: {videoId}
        <br />
        Master Playlist URL: {masterPlaylistUrl}
        <br />
        Quality Levels: {qualityOptions.length}
      </div>
    </div>
  );
}
