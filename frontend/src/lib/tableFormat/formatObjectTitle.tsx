import { Spacer } from '@components';
import { TableRowData } from '@components/table/types';
import { Thumbnail } from '@components/Thumbnail';
import styled from 'styled-components';

import nebula from '@/nebula';

const TitleNote = styled.span`
  color: var(--color-text-dim);
  font-size: 0.8em;
  font-style: italic;
`;

// The asset's picture before the title (browser tabs with thumbnails on,
// rundown items). The listings leave out a null `thumbnail_hash`: no hash
// is the placeholder. Browser rows are assets; rundown rows have the asset
// in id_asset.
const thumbnail = (rowData: TableRowData) => {
  if (rowData.type === 'event') return null;
  const id = (rowData.type ? rowData.id_asset : rowData.id) as number | undefined;
  const hash = (rowData.thumbnail_hash as string | undefined) ?? null;
  return <Thumbnail key={hash} id={id} hash={hash} />;
};

const formatObjectTitle = (
  rowData: TableRowData,
  key: string,
  withThumbnail = false
) => {
  const title = rowData[key] as string;
  const subtitle = rowData.subtitle as string;
  const note = rowData.note as string;
  const tstyle: React.CSSProperties = {};
  if (rowData.is_primary) tstyle.fontWeight = 'bold';
  return (
    <td>
      <div>
        {withThumbnail && thumbnail(rowData)}
        <span style={tstyle}>{title}</span>
        {subtitle && (
          <span style={{ color: 'var(--color-text-dim)' }}>
            {nebula.settings?.system?.subtitle_separator}
            {subtitle}
          </span>
        )}
        {note && <Spacer />}
        {note && <TitleNote>{note}</TitleNote>}
      </div>
    </td>
  );
};

export const formatTitleWithThumbnail = (rowData: TableRowData, key: string) =>
  formatObjectTitle(rowData, key, true);

export default formatObjectTitle;
