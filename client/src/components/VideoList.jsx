import React, { useEffect, useState } from "react";

export default function VideoList({ onSelectVideo }) {
  const [videos, setVideos] = useState([]);

  const fetchVideos = async () => {
    try {
      const res = await fetch("http://localhost:3000/videos");
      const data = await res.json();
      console.log("Fetched videos:", data);
      setVideos(data.videos || []);
    } catch (err) {
      console.error("Failed to load videos", err);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  return (
    <div className="section">
      <h3>Available Videos</h3>
      <button onClick={fetchVideos}>Refresh</button>
      <ul>
        {videos.map((video) => (
          <li key={video.videoId}>
            <span>{video.videoId}</span>
            <button onClick={() => onSelectVideo(video)}>Play</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
