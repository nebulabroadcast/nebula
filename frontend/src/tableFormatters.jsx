import { Timestamp } from '/src/components'

const tableFormatTime = (rowData, key) => {
  const timestamp = rowData[key]
  if (!timestamp)
    return (
      <td>
        <hr />
      </td>
    )
  return (
    <td>
      <Timestamp timestamp={timestamp} />
    </td>
  )
}

export { tableFormatTime }
