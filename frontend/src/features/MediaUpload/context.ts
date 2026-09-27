import { createContext } from 'react';

import type { MediaUploadContextType } from './types';

export const MediaUploadContext = createContext<MediaUploadContextType | undefined>(
  undefined
);
