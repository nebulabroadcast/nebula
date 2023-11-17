import nebula from '/src/nebula'
import { useEffect, useState } from 'react'
import { Table } from '/src/components'

const UserList = ({ onSelect, currentId, reloadTrigger }) => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    nebula
      .request('user_list')
      .then((res) => {
        setUsers(
          res.data.users.map((user) => ({
            ...user,
            password: undefined,
            api_key: undefined,
            api_key_preview: user.api_key,
          }))
        )
      })
      .finally(() => setLoading(false))
  }, [reloadTrigger])

  return (
    <section className="grow" style={{ maxWidth: 300 }}>
      <Table
        className="contained"
        data={users}
        loading={loading}
        selection={currentId ? [currentId] : []}
        onRowClick={(row) => onSelect(row)}
        keyField="id"
        columns={[
          {
            name: 'login',
            title: 'Login',
          },
        ]}
      />
    </section>
  )
}

export default UserList
