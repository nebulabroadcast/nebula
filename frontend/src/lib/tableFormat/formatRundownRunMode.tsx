import { TableRowData } from '@components/table/types';

import { RunMode } from '@/client';

const RUN_MODES: Record<RunMode, string> = {
  [RunMode.RUN_AUTO]: 'Auto',
  [RunMode.RUN_MANUAL]: 'Manual',
  [RunMode.RUN_SOFT]: 'Soft',
  [RunMode.RUN_HARD]: 'Hard',
  [RunMode.RUN_SKIP]: 'Skip',
};

const formatRundownRunMode = (rowData: TableRowData, key: string) => {
  const runMode = RUN_MODES[(rowData[key] as RunMode) || RunMode.RUN_AUTO];
  return <td className={'run-mode'}>{runMode}</td>;
};

export default formatRundownRunMode;
