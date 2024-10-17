import Table from '/src/components/table'
import { useMemo } from 'react'

const formatTime = (rowData, key) => {
  const timestamp = rowData[key]
  const date = new Date(timestamp * 1000)
  // format to hh:mm:ss
  const ftime = date.toTimeString().split(' ')[0]
  return <td>{ftime}</td>
}

const RundownTable = ({ data }) => {
  const columns = useMemo(
    () => [
      {
        title: 'Title',
        name: 'title',
      },
      {
        title: 'Scheduled',
        name: 'scheduled_time',
        width: 100,
        formatter: formatTime,
      },
      {
        title: 'Broacast',
        name: 'broadcast_time',
        width: 100,
        formatter: formatTime,
      },
    ],
    []
  )

  return <Table columns={columns} data={data} className="contained" />
}

export default RundownTable
