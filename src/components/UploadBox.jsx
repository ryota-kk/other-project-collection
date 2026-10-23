import { useRef, useState } from "react";

export default function UploadBox({ disabled, onFileSelected }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = event.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  }

  return (
    <section
      className={`upload-box${isDragging ? " is-dragging" : ""}`}
      data-edit-id="upload-dropzone"
      data-edit-label="Upload dropzone"
      onClick={() => inputRef.current?.click()}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(event) => {
        if (!disabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelected(file);
          event.target.value = "";
        }}
      />
      <span className="upload-title">上传图片转 SVG</span>
      <span className="upload-subtitle">点击选择文件，或把 JPG、JPEG、PNG 拖到这里</span>
    </section>
  );
}
