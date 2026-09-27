import type { JSX } from 'react/jsx-runtime';

import nebula from '@/nebula';

const formatAuthorship = (rowData: Record<string, any>, key: string): JSX.Element => {
  return <td>{nebula.getUserName(rowData[key] as number)}</td>;
};

export default formatAuthorship;
