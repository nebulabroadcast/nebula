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

const formatObjectStatus = (rowData, key) => {
  //
  // virtual rundown items don't have status
  if (rowData.item_role) return <td></td>;

  const status = STATUSES[rowData[key]];
  return <td className={clsx('status', status)}>{status}</td>;
};

export default formatObjectStatus;
