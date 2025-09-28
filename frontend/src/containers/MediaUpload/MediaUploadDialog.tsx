import { Dialog, Button } from '@components';
import { useMediaUpload } from '@hooks/useMediaUpload';
import React, { useState } from 'react';

import type { ContentType } from '@/client';

import { FileSelect } from './FileSelect';


interface UploadDialogProps {
  onHide: () => void;
  id: string; // Asset ID
  title: string; // Asset title
  contentType: ContentType;
}

export const MediaUploadDialog: React.FC<UploadDialogProps> = ({
  onHide,
  id,
  title,
  contentType,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const { addToQueue, UPLOAD_STATUS } = useMediaUpload();
  const [status, setStatus] = useState<typeof UPLOAD_STATUS.QUEUED | 'idle'>('idle'); // Local status

  const handleUpload = () => {
    if (!file) return;
    addToQueue(file, id, title);
    setStatus(UPLOAD_STATUS.QUEUED);
    onHide();
  };

  const footer = (
    <>
      <Button 
        label="Cancel" 
        icon="close" 
        onClick={onHide} 
      />
      <Button
        label="Upload"
        icon="upload"
        onClick={handleUpload}
        disabled={!file || status === UPLOAD_STATUS.QUEUED}
      />
    </>
  );

  return (
    <Dialog
      onHide={onHide}
      header={`Submit media file for upload: ${title}`}
      footer={footer}
    >
      <FileSelect 
        file={file} 
        setFile={setFile} 
        contentType={contentType} 
      />
    </Dialog>
  );
};
