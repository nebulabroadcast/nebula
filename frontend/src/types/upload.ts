export const UPLOAD_STATUS = {
  QUEUED: 'queued',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
  ERROR: 'error',
  CANCELED: 'canceled',
} as const;

// Get the union of literal string values from UPLOAD_STATUS
export type MediaUploadStatus = (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS];

// Define the shape of a single task in the upload queue
export interface MediaUploadTask {
  id: string;
  title: string;
  file: File;
  contentType: string;
  status: MediaUploadStatus;
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  controller: AbortController; // Used for cancellation
}

// Define the shape of the context object returned by useUploadQueue
export interface MediaUploadContextType {
  queue: MediaUploadTask[];
  addToQueue: (file: File, id: string, title: string) => void;
  cancelUpload: (id: string) => void;
  dismissTask: (id: string) => void;
  UPLOAD_STATUS: typeof UPLOAD_STATUS;
}
