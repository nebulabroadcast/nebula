import { Timestamp } from '/src/components'

const formatMetaDatetime = (rowData, key, mode = 'datetime') => (
  <td>
    <Timestamp timestamp={rowData[key]} mode={mode} />
  </td>
)

export default formatMetaDatetime
