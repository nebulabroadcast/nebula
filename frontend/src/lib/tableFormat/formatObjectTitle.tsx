import { Spacer } from '@components';
import styled from 'styled-components';
import nebula from '@/nebula';
import { TableRowData } from '@components/table/types';

const TitleNote = styled.span`
  color: var(--color-text-dim);
  font-size: 0.8em;
  font-style: italic;
`;

const formatObjectTitle = (rowData: TableRowData, key: string) => {
  const title = rowData[key] as string;
  const subtitle = rowData.subtitle as string;
  const note = rowData.note as string;
  const tstyle: React.CSSProperties = {};
  if (rowData.is_primary) tstyle.fontWeight = 'bold';
  return (
    <td>
      <div>
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

export default formatObjectTitle;
