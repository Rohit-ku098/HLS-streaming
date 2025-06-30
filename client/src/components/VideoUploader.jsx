import React, { useState } from "react";

export default function VideoUploader({ onUpload }) {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = e.target.video.files[0];
    if (!file) return;

    setStatus("Uploading and processing...");
    setLoading(true);

    const formData = new FormData();
    formData.append("video", file);

    try {
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setStatus("Upload and processing complete!");
        onUpload(data);
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setStatus(`Failed to upload: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section">
      <h3>Upload Video</h3>
      <form onSubmit={handleUpload}>
        <input type="file" name="video" accept="video/*" required />
        <button type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Upload & Convert"}
        </button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
}
