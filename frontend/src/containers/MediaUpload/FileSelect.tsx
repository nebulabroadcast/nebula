import React, { useRef, useMemo, DragEvent, ChangeEvent } from 'react';
import { FileSelectWrapper } from './FileSelect.styled';

import type { ContentType } from '@/client';

import nebula from '../../nebula';

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};


interface FileSelectProps {
  file: File | null;
  setFile: (file: File) => void;
  contentType: ContentType;
}


export const FileSelect: React.FC<FileSelectProps> = ({ file, setFile, contentType }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const onSelect = (selectedFile: File) => {
    // TODO: extension/type validation
    setFile(selectedFile);
  }

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files || [])];
    if (files.length === 0) return;
    onSelect(files[0]);
    if (inputRef.current) inputRef.current.value = ''; // Reset input
  };

  const accept = useMemo(() => {
    // TypeScript utility for object keys/values
    const result: string[] = [];
    const filetypes = nebula?.settings?.filetypes || {};
    for (const ext in filetypes) {
      const type = (filetypes as Record<string, ContentType>)[ext];
      if (type === contentType) result.push(`.${ext}`);
    }
    return result.join(',');
  }, [contentType]);


  //
  // Drag-and-Drop Handlers
  //

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    console.log('Drop event', e);
    e.preventDefault();

    const files = [...e.dataTransfer.files];
    if (files.length === 1) {
      onSelect(files[0]);
    }
  };


  const mainWidget = useMemo(() => {
    if (file) {
      return (
        <>
          <span>{file.name}</span>
          <span>{formatFileSize(file.size)}</span>
        </>
      )
    }

    return (
      <>
        <input
          style={{ display: 'none' }}
          ref={inputRef}
          accept={accept}
          id="file-upload"
          type="file"
          onChange={onChange}
          multiple={false}
        />
        <button onClick={(event) => { inputRef.current?.click(); event?.preventDefault(); }} >
          Click or drag-and-drop file to upload
        </button>
      </>
    )

  }, [file, accept]);


  return (
    <FileSelectWrapper
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {mainWidget}
    </FileSelectWrapper>
  );
};

