const formatBytes = (bytes: Number) => {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
};

export { formatBytes };

