import type { JobState } from '@/client';

export const JOB_STATE_COMPLETED: JobState = 2;

export interface WebSocketJobProgressMessage {
  id: number;
  status: JobState;
  progress: number;
  message?: string;
  id_asset?: number;
}
