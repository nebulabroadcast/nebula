import nebula from '@/nebula';
import { Icon } from '@components';
import { TableRowData } from '@components/table/types';

const formatRundownSymbol = (rowData: TableRowData) => {
  let icon = '';
  const style: React.CSSProperties = {};
  if (rowData.type === 'event') {
    icon = 'star';
    if (rowData.promoted) {
      style.color = '#FFD700'; // Gold color for promoted events
    } else {
      style.color = '#343434'; // Silver color for non-promoted events
    }
  } else if (rowData.type === 'item') {
    //style.fontSize = '18px'
    if (rowData.id_asset) {
      const folder = nebula.settings?.folders?.find((f) => f.id === rowData.id_folder);
      style.color = folder?.color;
      // icon = rowData.is_primary
      //   ? 'radio_button_checked'
      //   : 'radio_button_unchecked'
      icon = rowData.is_primary ? 'star' : 'fiber_manual_record';
    } else if (rowData.item_role === 'placeholder') {
      icon = 'expand';
    } else if (rowData.item_role === 'live') {
      icon = 'live_tv';
      style.color = 'red';
    } else if (rowData.item_role === 'lead_in') {
      icon = 'vertical_align_bottom';
    } else if (rowData.item_role === 'lead_out') {
      icon = 'vertical_align_top';
    } else {
      icon = 'question_mark';
    }
  } else {
    return <td></td>;
  }

  return (
    <td style={{ padding: 0 }}>
      <Icon style={style} icon={icon} />
    </td>
  );
};

export default formatRundownSymbol;
