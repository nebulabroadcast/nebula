import React, { useState, useRef, useMemo, DragEvent, ChangeEvent } from 'react';
import styled from 'styled-components';

import { Dialog, Button, Progress } from '/src/components';
import nebula from '/src/nebula';

import { useMediaUpload } from '../../hooks/useMediaUpload';
import { MediaUploadTask } from '../../types/upload';


const StatusMessage = styled.div`
  border: 1px solid red;
`;


const FileDetailWrapper = styled.div`
`;


interface FileSelectWidgetProps {
  onSelect: (file: File) => void;
  disabled: boolean;
  contentType: string;
}

const FileSelectWidget: React.FC<FileSelectWidgetProps> = ({
  onSelect,
  disabled,
  contentType,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files || [])];
    if (files.length === 0) return;
    onSelect(files[0]);
    if (inputRef.current) inputRef.current.value = ''; // Reset input
  };

  const accept = useMemo(() => {
    // TypeScript utility for object keys/values
    const result: string[] = [];
    for (const ext in nebula.settings.filetypes) {
      const type = (nebula.settings.filetypes as Record<string, string>)[ext];
      if (type === contentType) result.push(`.${ext}`);
    }
    return result.join(',');
  }, [contentType]);

  return (
    <>
      <Button
        disabled={disabled}
        label="Select File"
        icon="upload"
        onClick={() => {
          inputRef.current?.click();
        }}
      />
      <input
        style={{ display: 'none' }}
        ref={inputRef}
        accept={accept}
        id="file-upload"
        type="file"
        onChange={onChange}
        multiple={false}
      />
    </>
  );
};

interface FileDetailsProps {
  file: File | null;
  progressPercent: number; // Now optional/dummy in the dialog, used in monitor
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const FileDetails: React.FC<FileDetailsProps> = ({ file, progressPercent }) => {
  if (!file) {
    return (
      <FileDetailWrapper $isDragActive={false}>
        <h2> No File Selected </h2>
      </FileDetailWrapper>
    );
  }

  return (
    <FileDetailWrapper $isDragActive={false}>
      <h2>
        {file.name} ({formatFileSize(file.size)})
      </h2>
      {/* The progress bar is now mostly for the Monitor, but keep here for potential future use */}
      {progressPercent > 0 && <Progress value={progressPercent} />}
    </FileDetailWrapper>
  );
};

interface UploadDialogProps {
  onHide: () => void;
  id: string; // Asset ID
  title: string; // Asset title
  contentType: string;
}

const UploadDialog: React.FC<UploadDialogProps> = ({ onHide, id, title, contentType }) => {
  const [file, setFile] = useState<File | null>(null);
  const { addToQueue, UPLOAD_STATUS } = useMediaUpload();
  const [status, setStatus] = useState<typeof UPLOAD_STATUS.QUEUED | 'idle'>('idle'); // Local status

  const [isDragActive, setIsDragActive] = useState(false);

  const handleUpload = () => {
    if (!file) return;

    // 1. Submit the file to the global queue
    addToQueue(file, id, title);

    setStatus(UPLOAD_STATUS.QUEUED);
    toast.success(`File "${file.name}" queued for upload.`);
    onHide();
  };

  // Drag-and-Drop Handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);

    const files = [...e.dataTransfer.files];
    if (files.length === 1) {
      setFile(files[0]);
    }
  };

  const footer = (
    <>
      <FileSelectWidget
        onSelect={setFile}
        disabled={false}
        contentType={contentType}
      />
      <Button
        label="Submit for Upload"
        icon="upload"
        onClick={handleUpload}
        disabled={!file || status === UPLOAD_STATUS.QUEUED}
      />
      <Button label="Close" icon="close" onClick={onHide} />
    </>
  );

  return (
    <Dialog
      onHide={onHide}
      header={`Submit media file for upload: ${title}`}
      footer={footer}
    >
      <FileDetailWrapper
        $isDragActive={isDragActive}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <FileDetails file={file} progressPercent={0} />
        <StatusMessage
          className={status === UPLOAD_STATUS.QUEUED ? UPLOAD_STATUS.SUCCESS : 'idle'}
        >
          {/* Status message content handled by styled component's ::before */}
        </StatusMessage>
      </FileDetailWrapper>
    </Dialog>
  );
};

interface UploadButtonProps {
  id: string; // Asset ID (unique identifier of the task as well)
  title: string; // Asset title (for display purposes)
  contentType: string; 
  disabled: boolean;
}

export const UploadButton: React.FC<UploadButtonProps> = ({ id, title, contentType, disabled }) => {
  const [dialogVisible, setDialogVisible] = useState(false);

  return (
    <>
      {dialogVisible && (
        <UploadDialog id={id} title={title} contentType={contentType} onHide={() => setDialogVisible(false)} />
      )}
      <Button
        icon="upload"
        label="Upload media"
        onClick={() => setDialogVisible(true)}
        disabled={disabled}
      />
    </>
  );
};

export { UploadDialog };
