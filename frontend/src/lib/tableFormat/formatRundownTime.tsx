import { Timestamp } from '@components';
import { TableRowData } from '@components/table/types';

const formatRundownTime = (rowData: TableRowData, key: string) => {
  if (
    rowData.run_mode === 4 ||
    rowData.item_role === 'lead_in' ||
    rowData.item_role === 'lead_out'
  ) {
    return (
      <td>
        <hr />
      </td>
    );
  }

  return (
    <td>
      <Timestamp timestamp={rowData[key] as number} mode="time" />
    </td>
  );
};

export default formatRundownTime;
