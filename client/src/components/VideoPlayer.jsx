import React, { useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import VideoJS from "./VideoJS";

export default function VideoPlayer({ src, videoId }) {
    const playerRef = React.useRef(null);

    const videoJsOptions = {
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
    };

    const handlePlayerReady = (player) => {
      playerRef.current = player;

      // You can handle player events here, for example:
      player.on("waiting", () => {
        videojs.log("player is waiting");
      });

      player.on("dispose", () => {
        videojs.log("player will dispose");
      });
    };

    return (
      <>
        <div>Rest of app here</div>
        <VideoJS options={videoJsOptions} onReady={handlePlayerReady} />
        <div>Rest of app here</div>
      </>
    );
}
