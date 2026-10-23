import { useState } from "react";

import { uploadImage } from "../api/client";
import UploadBox from "../components/UploadBox";

export default function HomePage({ onUploadComplete, onHistory, onHome }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFileSelected(file) {
    setBusy(true);
    setMessage("正在上传图片...");

    try {
      const uploaded = await uploadImage(file);
      setMessage("上传成功。");
      onUploadComplete(uploaded);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell single-column" data-edit-id="vector-page" data-edit-label="Vector upload page">
      <section className="workspace upload-workspace" data-edit-id="vector-workspace" data-edit-label="Upload workspace">
        <div className="result-header" data-edit-id="vector-header" data-edit-label="Upload page header">
          <div className="masthead" data-edit-id="vector-masthead" data-edit-label="Upload masthead">
            <p data-edit-id="vector-eyebrow" data-edit-label="Upload eyebrow">Label Vectorizer MVP</p>
            <h1>上传图片转 SVG</h1>
          </div>
          <div className="header-actions" data-edit-id="vector-header-actions" data-edit-label="Upload header actions">
            <button className="secondary-button" type="button" onClick={onHome} data-edit-id="vector-home-button" data-edit-label="Personal home button">
              个人首页
            </button>
            <button className="secondary-button" type="button" onClick={onHistory} data-edit-id="vector-history-button" data-edit-label="History button">
              历史记录
            </button>
          </div>
        </div>
        <UploadBox disabled={busy} onFileSelected={handleFileSelected} />
        {message ? <p className="status">{message}</p> : null}
      </section>
    </main>
  );
}
