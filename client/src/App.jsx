import React, { useState } from "react";
import VideoUploader from "./components/VideoUploader";
import VideoPlayer from "./components/VideoPlayer";
import VideoList from "./components/VideoList";
import "./App.css";

export default function App() {
  const [currentVideo, setCurrentVideo] = useState(null);
  console.log(currentVideo)
  return (
    <div className="app-container">
      <h1>🎬 HLS Streaming Server</h1>
      <VideoUploader onUpload={setCurrentVideo} />
      {currentVideo && (
        <VideoPlayer
          src={currentVideo.masterPlaylist}
          videoId={currentVideo.videoId}
        />
      )}
      <VideoList onSelectVideo={setCurrentVideo} />
    </div>
  );
}
