import { TableRowData } from '@components/table/types';
import clsx from 'clsx';

import { ObjectStatus } from '@/client';

const STATUSES: Record<ObjectStatus, string> = {
  [ObjectStatus.OFFLINE]: 'offline',
  [ObjectStatus.ONLINE]: 'online',
  [ObjectStatus.CREATING]: 'creating',
  [ObjectStatus.TRASHED]: 'trashed',
  [ObjectStatus.ARCHIVED]: 'archived',
  [ObjectStatus.RESET]: 'reset',
  [ObjectStatus.CORRUPTED]: 'corrupted',
  [ObjectStatus.REMOTE]: 'remote',
  [ObjectStatus.UNKNOWN]: 'unknown',
  [ObjectStatus.AIRED]: 'aired',
  [ObjectStatus.ONAIR]: 'onair',
  [ObjectStatus.RETRIEVING]: 'retrieving',
};

const formatObjectStatus = (rowData: TableRowData, key: string) => {
  //
  // virtual rundown items don't have status
  if (rowData.item_role) return null;

  const status = STATUSES[rowData[key] as ObjectStatus];
  return <span className={clsx('status', status)}>{status}</span>;
};

export default formatObjectStatus;
