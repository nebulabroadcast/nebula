import axios, { AxiosProgressEvent } from 'axios';
import { toast } from 'react-toastify';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';

import nebula from '../nebula';

import {
  MediaUploadTask,
  MediaUploadContextType,
  MediaUploadStatus,
  UPLOAD_STATUS,
} from '../types/upload';

const MediaUploadContext = createContext<MediaUploadContextType | undefined>(undefined);

export const useMediaUpload = (): MediaUploadContextType => {
  const context = useContext(MediaUploadContext);
  if (context === undefined) {
    throw new Error('useMediaUpload must be used within an MediaUploadProvider');
  }
  return context;
};

const useMediaUploadLogic = (): MediaUploadContextType => {
  const [queue, setQueue] = useState<MediaUploadTask[]>([]);
  const activeUploadRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);

  //
  // Prevent tab/window close if uploads are in progress
  //

  const beforeUnloadHandler = useCallback(
    (event: BeforeUnloadEvent) => {
      const uploadsInProgress = queue.some(
        (t) => t.status === UPLOAD_STATUS.UPLOADING || t.status === UPLOAD_STATUS.QUEUED
      );

      if (uploadsInProgress) {
        const message = 'You have uploads in progress. Are you sure you want to leave?';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    },
    [queue]
  );

  useEffect(() => {
    window.addEventListener('beforeunload', beforeUnloadHandler);
    return () => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    };
  }, [beforeUnloadHandler]);

  //
  // Action handlers to modify the upload queue state
  //

  const updateTask = useCallback((id: string, updates: Partial<MediaUploadTask>) => {
    setQueue((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
    );
  }, []);

  const addToQueue = useCallback((file: File, id: string, title: string) => {
    const newTask: MediaUploadTask = {
      id,
      title,
      file,
      status: UPLOAD_STATUS.QUEUED,
      progress: 0,
      bytesTransferred: 0,
      totalBytes: file.size,
      controller: new AbortController(),
    };
    setQueue((prev) => [...prev, newTask]);
  }, []);

  const cancelUpload = useCallback(
    (id: string) => {
      const taskToCancel = queue.find((t) => t.id === id);
      if (taskToCancel) {
        taskToCancel.controller.abort();
        // Update status immediately so UI reflects cancellation
        updateTask(id, { status: UPLOAD_STATUS.CANCELED, progress: 0 });
      }
    },
    [queue, updateTask]
  );

  const dismissTask = useCallback((id: string) => {
    setQueue((prev) => prev.filter((task) => task.id !== id));
  }, []);

  //
  // Upload queue processor
  //

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || activeUploadRef.current) return;

    const nextTask = queue.find((t) => t.status === UPLOAD_STATUS.QUEUED);

    if (!nextTask) return; // No queued tasks

    isProcessingRef.current = true;
    activeUploadRef.current = nextTask.id;

    const { id, file, controller } = nextTask;
    updateTask(id, { status: UPLOAD_STATUS.UPLOADING as MediaUploadStatus });

    try {
      const handleProgress = (event: AxiosProgressEvent) => {
        if (!event.total) return;
        const progress = Math.round((event.loaded / event.total) * 100);
        updateTask(id, { progress, bytesTransferred: event.loaded });
      };

      const extension = file.name.split('.').pop();

      await axios.post(`/upload/${id}`, file, {
        signal: controller.signal,
        onUploadProgress: handleProgress,
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-nebula-extension': extension,
          Authorization: `Bearer ${nebula.getAccessToken()}`,
        },
      });

      toast.success(`File "${file.name}" uploaded successfully.`);
      updateTask(id, {
        status: UPLOAD_STATUS.SUCCESS as MediaUploadStatus,
        progress: 100,
        bytesTransferred: file.size,
      });
    } catch (error) {
      if (axios.isCancel(error) || (error as Error).name === 'AbortError') {
        // Log cancellation, task status already set by cancelUpload or processCleanup
        console.warn(`Upload ${id} was canceled.`);
      } else {
        console.error(`Upload ${id} failed:`, error);
        updateTask(id, {
          status: UPLOAD_STATUS.ERROR as MediaUploadStatus,
          progress: 0,
        });
      }
    } finally {
      activeUploadRef.current = null;
      isProcessingRef.current = false;
      // Process the next task immediately
      setTimeout(processQueue, 0);
    }
  }, [queue, updateTask]);

  useEffect(() => {
    processQueue();
  }, [queue, processQueue]);

  return {
    queue,
    addToQueue,
    cancelUpload,
    dismissTask,
    UPLOAD_STATUS,
  };
};

interface MediaUploadProviderProps {
  children: ReactNode;
}

export const MediaUploadProvider: React.FC<MediaUploadProviderProps> = ({
  children,
}) => {
  const logic = useMediaUploadLogic();
  return (
    <MediaUploadContext.Provider value={logic}>{children}</MediaUploadContext.Provider>
  );
};
