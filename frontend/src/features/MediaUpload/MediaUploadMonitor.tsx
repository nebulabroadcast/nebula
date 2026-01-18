import { Button, Progress } from '@components';
import { useMediaUpload } from '@features/MediaUpload/useMediaUpload';
import React from 'react';

import { MonitorWrapper, MonitorItemWrapper } from './MediaUploadMonitor.styled';
import type { MediaUploadTask } from './types';

interface MonitorItemProps {
  task: MediaUploadTask;
}

const MonitorItem = ({ task }: MonitorItemProps) => {
  const { cancelUpload, dismissTask, UPLOAD_STATUS } = useMediaUpload();

  const active =
    task.status === UPLOAD_STATUS.UPLOADING || task.status === UPLOAD_STATUS.QUEUED;
  const progress = active && <Progress value={task.progress} />;

  return (
    <MonitorItemWrapper key={task.id} className={task.status.toLowerCase()}>
      <span className="status">{task.status}</span>
      <span className="info">
        File "{task.file.name}" to asset {task.title}
      </span>

      {progress}

      <div className="actions">
        {active ? (
          <Button label="Cancel" onClick={() => cancelUpload(task.id)} />
        ) : (
          <Button label="Dismiss" onClick={() => dismissTask(task.id)} />
        )}
      </div>
    </MonitorItemWrapper>
  );
};

export const MediaUploadMonitor: React.FC = () => {
  const { queue, UPLOAD_STATUS } = useMediaUpload();

  return (
    <MonitorWrapper>
      {queue
        .filter((t) => t.status !== UPLOAD_STATUS.SUCCESS)
        .map((task: MediaUploadTask) => (
          <MonitorItem key={task.id} task={task} />
        ))}
    </MonitorWrapper>
  );
};
