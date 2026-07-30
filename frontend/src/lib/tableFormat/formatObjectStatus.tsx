import { TableRowData } from '@components/table/types';
import clsx from 'clsx';

const STATUSES = [
  'offline',
  'online',
  'creating',
  'trashed',
  'archived',
  'reset',
  'corrupted',
  'remote',
  'unknown',
  'aired',
  'onair',
  'retrieving',
];

const formatObjectStatus = (rowData: TableRowData, key: string) => {
  //
  // virtual rundown items don't have status
  if (rowData.item_role) return <td></td>;

  const status = STATUSES[rowData[key] as number];
  return <td className={clsx('status', status)}>{status}</td>;
};

export default formatObjectStatus;
