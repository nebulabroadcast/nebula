export interface SubclipData {
  title: string;
  mark_in: number;
  mark_out: number;
}

export interface AssetData extends Record<string, any> {
  id?: number;
  'file/mtime'?: number;
  'video/fps_f'?: number;
  mark_in?: number | null;
  mark_out?: number | null;
  subclips?: SubclipData[];
  poster_frame?: number | null;
  title?: string;
  subtitle?: string;
}

export interface ProxyInfo {
  id: number;
  available: boolean;
  timestamp: number;
}
