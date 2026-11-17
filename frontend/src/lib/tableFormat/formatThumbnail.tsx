import { TableRowData } from '@components/table/types';
import { Thumbnail } from '@components/Thumbnail';

// Browser rows are assets; rundown rows have the asset in id_asset
const formatThumbnail = (rowData: TableRowData) => {
  if (rowData.type === 'event') return <td />;
  const id = (rowData.type ? rowData.id_asset : rowData.id) as number | undefined;
  const hash = rowData.thumbnail_hash as string | undefined;
  return (
    <td>
      <Thumbnail key={hash} id={id} hash={hash} />
    </td>
  );
};

export default formatThumbnail;
