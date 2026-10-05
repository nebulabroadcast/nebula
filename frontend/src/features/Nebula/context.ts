import { createContext } from 'react';

import type { NebulaContextType } from './types';

export const NebulaContext = createContext<NebulaContextType | undefined>(undefined);
