import { TableRowData } from '@components/table/types';

import nebula from '@/nebula';

const formatObjectIdFolder = (rowData: TableRowData, key: string) => {
  const folder = nebula.settings?.folders?.find((f) => f.id === rowData[key]);
  return <span style={{ color: folder?.color }}>{folder?.name}</span>;
};

export default formatObjectIdFolder;
