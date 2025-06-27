import React, { useEffect, useRef, useState, useMemo } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import VideoJS from "./VideoJS";
import "videojs-contrib-quality-levels";

export default function VideoPlayer({ src }) {
  const playerRef = useRef(null);
  const [qualityOptions, setQualityOptions] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState("auto");
  const qualityInitializedRef = useRef(false);

  const videoJsOptions = useMemo(
    () => ({
      autoplay: true,
      controls: true,
      responsive: true,
      fluid: true,
      sources: [
        {
          src: "http://localhost:3000" + src,
          type: "application/x-mpegURL",
        },
      ],
    }),
    [src]
  );

  const handlePlayerReady = (player) => {
    playerRef.current = player;

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
    };

    // Wait for quality levels to load
    player.on("loadedmetadata", () => {
      setTimeout(updateQualityListOnce, 500);
    });

    player.on("waiting", () => {
      videojs.log("player is waiting");
    });

    player.on("dispose", () => {
      videojs.log("player will dispose");
    });
  };

  const handleQualityChange = (value) => {
    const player = playerRef.current;
    console.log("handleQualityChange", value)
    if (!player) return;

    if (value === "auto") {
      hls.selectPlaylist = undefined; // Restore default adaptive behavior
      const qualityLevels = player.qualityLevels();
      for (let i = 0; i < qualityLevels.length; i++) {
        qualityLevels[i].enabled = true;
      }
    } else {
      const qualityLevels = player.qualityLevels();
      const targetHeight = parseInt(value);

      // Disable all levels except selected
      for (let i = 0; i < qualityLevels.length; i++) {
        qualityLevels[i].enabled = qualityLevels[i].height === targetHeight;
      }
    }

    setSelectedQuality(value);
  };
  

  return (
    <>
      <div>Custom Quality Selector</div>

      <VideoJS options={videoJsOptions} onReady={handlePlayerReady} />

      {qualityOptions.length > 0 && (
        <div style={{ marginTop: "12px" }}>
          <label htmlFor="quality-select">Select Quality: </label>
          <select
            id="quality-select"
            value={selectedQuality}
            onChange={(e) => handleQualityChange(e.target.value)}
          >
            <option value="auto">Auto</option>
            {qualityOptions.map((q) => (
              <option key={q.height} value={q.height}>
                {q.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
