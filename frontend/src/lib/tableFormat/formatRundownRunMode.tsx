import { TableRowData } from '@components/table/types';

const RUN_MODES = ['Auto', 'Manual', 'Soft', 'Hard', 'Skip'];

const formatRundownRunMode = (rowData: TableRowData, key: string) => {
  const runMode = RUN_MODES[(rowData[key] as number) || 0];
  return <td className={'run-mode'}>{runMode}</td>;
};

export default formatRundownRunMode;
