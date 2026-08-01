import type { JobState } from '@/client';

export interface WebSocketJobProgressMessage {
  id: number;
  status: JobState;
  progress: number;
  message?: string;
  id_asset?: number;
}
