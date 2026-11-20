import { Timestamp } from '@components';
import { TableRowData } from '@components/table/types';

const formatMetaDatetime = (
  rowData: TableRowData,
  key: string,
  mode: 'date' | 'time' | 'datetime' = 'datetime'
) => {
  const timestamp = rowData[key];
  if (!timestamp) return <hr />;
  return <Timestamp timestamp={timestamp as number} mode={mode} />;
};

export default formatMetaDatetime;
