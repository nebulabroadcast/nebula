import { useContext } from 'react';

import { MediaUploadContext } from './context';
import type { MediaUploadContextType } from './types';

export const useMediaUpload = (): MediaUploadContextType => {
  const context = useContext(MediaUploadContext);
  if (context === undefined) {
    throw new Error('useMediaUpload must be used within an MediaUploadProvider');
  }
  return context;
};
