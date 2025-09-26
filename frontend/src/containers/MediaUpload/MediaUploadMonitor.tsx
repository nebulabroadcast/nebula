import { Button, Progress } from '@components';
import { useMediaUpload } from '@hooks/useMediaUpload';
import React, { useMemo } from 'react';
import styled from 'styled-components';


import type { MediaUploadTask } from '../../types/upload';

const MonitorWrapper = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  border: 1px solid #ccc;
`;

const TaskItem = styled.div`
  background: #444;
  border: 1px solid;
  padding: 10px;
  margin-bottom: 10px;
  width: 300px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;

    .status {
      font-weight: bold;
      text-transform: uppercase;
    }
  }

  .actions {
    margin-top: 10px;
    text-align: right;
  }
`;

const formatFileName = (name: string): string => {
  if (name.length > 25)
    return name.substring(0, 10) + '...' + name.substring(name.length - 12);
  return name;
};

export const MediaUploadMonitor: React.FC = () => {
  const { queue, cancelUpload, dismissTask, UPLOAD_STATUS } = useMediaUpload();

  // Logic to filter and sort tasks
  const activeTasks = useMemo(() => {
    return queue
      .filter((t) => t.status !== UPLOAD_STATUS.SUCCESS)
      .sort((a, b) => {
        const aActive =
          a.status === UPLOAD_STATUS.UPLOADING || a.status === UPLOAD_STATUS.QUEUED;
        const bActive =
          b.status === UPLOAD_STATUS.UPLOADING || b.status === UPLOAD_STATUS.QUEUED;
        if (aActive !== bActive) return bActive ? 1 : -1; // Bring active to top
        return parseInt(a.id, 36) - parseInt(b.id, 36); // Sort by submission time
      });
  }, [queue, UPLOAD_STATUS]);

  if (activeTasks.length === 0) return null;

  const activeCount = activeTasks.filter(
    (t) => t.status !== UPLOAD_STATUS.SUCCESS && t.status !== UPLOAD_STATUS.ERROR
  ).length;

  return (
    <MonitorWrapper>
      <h3>Background Uploads ({activeCount} remaining)</h3>
      {activeTasks.map((task: MediaUploadTask) => (
        <TaskItem key={task.id} $status={task.status}>
          <div className="header">
            <span title={task.file.name}>{formatFileName(task.file.name)}</span>
            <span className="status">{task.status.toUpperCase()}</span>
          </div>
          {(task.status === UPLOAD_STATUS.UPLOADING ||
            task.status === UPLOAD_STATUS.QUEUED) && <Progress value={task.progress} />}
          <div className="actions">
            {task.status === UPLOAD_STATUS.UPLOADING ||
            task.status === UPLOAD_STATUS.QUEUED ? (
              <Button label="Cancel" onClick={() => cancelUpload(task.id)} />
            ) : (
              <Button label="Dismiss" onClick={() => dismissTask(task.id)} />
            )}
          </div>
        </TaskItem>
      ))}
    </MonitorWrapper>
  );
};
