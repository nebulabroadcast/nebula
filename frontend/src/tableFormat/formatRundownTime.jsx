import { Timestamp } from '/src/components'

const formatRundownTime = (rowData, key) => {
  if (
    rowData.run_mode === 4 ||
    rowData.item_role === 'lead_in' ||
    rowData.item_role === 'lead_out'
  ) {
    return (
      <td>
        <hr />
      </td>
    )
  }

  return (
    <td>
      <Timestamp timestamp={rowData[key]} mode="time" />
    </td>
  )
}

export default formatRundownTime
