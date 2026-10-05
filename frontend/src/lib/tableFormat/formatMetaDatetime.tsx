import { Timestamp } from '@components';
import { TableRowData } from '@components/table/types';

const formatMetaDatetime = (
  rowData: TableRowData,
  key: string,
  mode: 'date' | 'time' | 'datetime' = 'datetime'
) => {
  const timestamp = rowData[key];
  if (!timestamp)
    return (
      <td>
        <hr />
      </td>
    );
  return (
    <td>
      <Timestamp timestamp={timestamp as number} mode={mode} />
    </td>
  );
};

export default formatMetaDatetime;
