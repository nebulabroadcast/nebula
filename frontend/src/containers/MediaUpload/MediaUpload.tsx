import React, { useState } from 'react';
import { useMediaUpload } from '@hooks/useMediaUpload';
import { Button } from '@components';

import type { ContentType } from '@/client';
import { MediaUploadDialog } from './MediaUploadDialog';

interface UploadButtonProps {
  id: string; // Asset ID (unique identifier of the task as well)
  title: string; // Asset title (for display purposes)
  contentType: ContentType;
  disabled: boolean;
}

export const UploadButton: React.FC<UploadButtonProps> = ({
  id,
  title,
  contentType,
  disabled,
}) => {
  const [dialogVisible, setDialogVisible] = useState(false);
  const { queue } = useMediaUpload();

  // Disable button if there's already an upload task for this asset in the queue
  const isAlreadyQueued = queue.some(
    (task) =>
      task.id === id && (task.status === 'queued' || task.status === 'uploading')
  );

  const label = isAlreadyQueued ? 'Uploading...' : 'Upload Media';

  return (
    <>
      {dialogVisible && (
        <MediaUploadDialog
          id={id}
          title={title}
          contentType={contentType}
          onHide={() => setDialogVisible(false)}
        />
      )}
      <Button
        icon="upload"
        label={label}
        onClick={() => setDialogVisible(true)}
        disabled={disabled || isAlreadyQueued}
      />
    </>
  );
};
