import { Timecode } from '@wfoxall/timeframe';
import { TableRowData } from '@components/table/types';

const formatObjectDuration = (rowData: TableRowData, key: string) => {
  if (rowData.run_mode === 4) {
    return (
      <td>
        <hr />
      </td>
    );
  }

  if (rowData.item_role === 'lead_in' || rowData.item_role === 'lead_out') {
    return (
      <td>
        <hr />
      </td>
    );
  }

  const fps = (rowData['video/fps_f'] as number) || 25;
  let duration = (rowData[key] as number) || 0;
  if (rowData.mark_out) duration = rowData.mark_out as number;
  if (rowData.mark_in) duration -= rowData.mark_in as number;
  const originalDuration = (rowData.duration as number) || 0;
  const trimmed = duration < originalDuration;
  const timecode = new Timecode(duration * fps, fps);
  const title =
    trimmed && `Original duration ${new Timecode(originalDuration * fps, fps)}`;
  return (
    <td title={title || ''}>
      {timecode.toString().substring(0, 11)}
      {trimmed && '*'}
    </td>
  );
};

export default formatObjectDuration;
