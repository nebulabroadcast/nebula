import nebula from '@/nebula';
import { TableRowData } from '@components/table/types';

const formatObjectIdFolder = (rowData: TableRowData, key: string) => {
  const folder = nebula.settings?.folders?.find((f) => f.id === rowData[key]);
  return <td style={{ color: folder?.color }}>{folder?.name}</td>;
};

export default formatObjectIdFolder;
