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

  const loadSessions = () => {
    setLoading(true)
    nebula
      .request('sessions', { id_user: userId })
      .then((res) => {
        setSessions(res.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadSessions()
  }, [userId])


  const invalidateSession = (token) => {
    nebula
      .request('invalidate_session', { token })
      .then(() => {
          loadSessions()
        })
      .catch((err) => console.error(err))
  }


  const invalidateFormatter = (rowData) => {
    const token = rowData['token']
    return (
      <td onClick={() => invalidateSession(token)}>
        X
      </td>
    )
  }

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
          {
            name: 'invalidate',
            title: 'Invalidate',
            width: 100,
            formatter: invalidateFormatter,
          }
        ]}
      />
    </section>
  )
}

export default Sessions
