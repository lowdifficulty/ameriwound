"use client";

import { useRef, useState } from "react";

interface FileDropzoneProps {
  accept: string;
  multiple?: boolean;
  title: string;
  hint: string;
  icon: React.ReactNode;
  fileLabel?: string;
  onChange: (files: File[]) => void;
}

export function FileDropzone({
  accept,
  multiple,
  title,
  hint,
  icon,
  fileLabel,
  onChange,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    onChange(Array.from(fileList));
  }

  return (
    <div
      className={`dropzone${fileLabel ? " has-file" : ""}${dragging ? " dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={title}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFiles(e.target.files)}
        tabIndex={-1}
      />
      <div className="dropzone-icon">{icon}</div>
      <span className="dropzone-title">{title}</span>
      <span className="dropzone-hint">{hint}</span>
      {fileLabel && <span className="dropzone-file">{fileLabel}</span>}
    </div>
  );
}
