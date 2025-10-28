export interface NebulaUsageStats {
  label: string;
  usage: number; // in bytes
  color: string; // hex color code
}

export interface StorageStats {
  total: number; // in bytes
  used: number; // in bytes
  untracked: number; // in bytes
  nebula_usage: NebulaUsageStats[]; // array of usage stats
}

export const formatBytes = (bytes: number) => {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
};
