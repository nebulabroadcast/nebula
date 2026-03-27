export interface VideoPlayerProps {
  src?: string;
  frameRate: number;
  setPosition?: (time: number) => void;
  setMarkIn?: (time: number | null) => void;
  setMarkOut?: (time: number | null) => void;
  markIn?: number;
  markOut?: number;
  warning?: string;
  marks?: Record<string, number>;
}
