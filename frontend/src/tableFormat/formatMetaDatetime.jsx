import { Timestamp } from '/src/components'

const formatMetaDatetime = (rowData, key, mode = 'datetime') => {
  const timestamp = rowData[key]
  if (!timestamp)
    return (
      <td>
        <hr />
      </td>
    )
  return (
    <td>
      <Timestamp timestamp={rowData[key]} mode={mode} />
    </td>
  )
}

export default formatMetaDatetime
