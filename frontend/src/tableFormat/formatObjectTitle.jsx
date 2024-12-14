import styled from 'styled-components'
import nebula from '/src/nebula'
import { Spacer } from '../components'

const TitleNote = styled.span`
  color: var(--color-text-dim);
  font-size: 0.8em;
  font-style: italic;
`

const formatObjectTitle = (rowData, key) => {
  const title = rowData[key]
  const subtitle = rowData.subtitle
  const note = rowData.note
  const tstyle = {}
  if (rowData.is_primary) tstyle.fontWeight = 'bold'
  return (
    <td>
      <div>
        <span style={tstyle}>{title}</span>
        {subtitle && (
          <span style={{ color: 'var(--color-text-dim)' }}>
            {nebula.settings.system.subtitle_separator}
            {subtitle}
          </span>
        )}
        {note && <Spacer />}
        {note && <TitleNote>{note}</TitleNote>}
      </div>
    </td>
  )
}

export default formatObjectTitle
