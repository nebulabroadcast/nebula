import { useContext } from 'react';

import { NebulaContext } from './NebulaProvider';
import type { NebulaContextType } from './types';

export const useNebula = (): NebulaContextType => {
  const context = useContext(NebulaContext);
  if (!context) {
    throw new Error('useNebula must be used within a NebulaProvider');
  }
  return context;
};
