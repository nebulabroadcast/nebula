import {useState, useEffect} from 'react'
import nebula from '/src/nebula'
import {Table, Timestamp} from '/src/components'

const FormattedTimestamp = (rowData) => {
  const timestamp = parseInt(rowData['accessed'])
  console.log(timestamp)
  return (
    <td>
      <Timestamp timestamp={timestamp} />
    </td>
  )
}

const FormattedClientInfo = (rowData) => {
  const clientInfo = rowData['client_info']

  return (
    <td>
      {clientInfo?.ip || 'Unknown'} ({clientInfo?.agent?.platform || 'Unknown'}{' '}
      {clientInfo?.agent?.client || ''})
    </td>
  )
}

const Sessions = ({userId}) => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    nebula
      .request('sessions', { id_user: userId })
      .then((res) => {
        setSessions(res.data)
      })
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <section className="column grow" style={{ minWidth: 500 }}>
      <Table
        data={sessions}
        loading={loading}
        className="contained"
        keyField="token"
        columns={[
          {
            name: 'client_info',
            title: 'Active session',
            formatter: FormattedClientInfo,
          },
          {
            name: 'accessed',
            title: 'Last used',
            width: 150,
            formatter: FormattedTimestamp,
          },
        ]}
      />
    </section>
  )
}

export default Sessions
