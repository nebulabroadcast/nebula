import { toast } from 'react-toastify'
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import nebula from '/src/nebula'
import { Navbar, Button, Spacer } from '/src/components'

import Sessions from '/src/containers/Sessions'
import UserList from './UserList'
import UserForm from './UserForm'

const UsersPage = () => {
  const { id } = useParams()
  const [users, setUsers] = useState([])

  const navigate = useNavigate()

  const [userData, setUserData] = useState({})
  const [loading, setLoading] = useState(false)

  const currentId = useMemo(() => {
    const intId = parseInt(id)
    if (!isNaN(intId)) return intId
    return null
  }, [id])

  const loadUsers = () => {
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
  }

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    if (currentId) {
      const user = users.find((user) => user.id === currentId)
      if (user) {
        setUserData(user)
        return
      }
    }
    const doCopy = new URLSearchParams(window.location.search).get('copy')
    if (!doCopy) setUserData({})
  }, [currentId, users])

  const onSelect = (userId) => {
    navigate(`/users/${userId}`)
  }

  const onSave = () => {
    nebula
      .request('save_user', userData)
      .then(() => {
        loadUsers()
      })
      .catch((err) => {
        toast.error('Error saving user')
        console.error(err)
      })
      .finally(() => {
        setUserData((data) => ({
          ...data,
          password: undefined,
          api_key: undefined,
        }))
      })
  }

  const copyUser = () => {
    const copy = { ...userData }
    for (const key of [
      'id',
      'login',
      'password',
      'api_key',
      'api_key_preview',
      'full_name',
      'email',
    ])
      copy[key] = undefined
    navigate('/users?copy=true')
    setUserData(copy)
  }

  return (
    <main className="column">
      <Navbar>
        <Button
          icon="person_add"
          label="New user"
          onClick={() => navigate('/users')}
        />
        <Button
          icon="content_copy"
          label="Copy user"
          onClick={() => copyUser()}
          disabled={!userData?.id}
        />
        <Spacer />
        <Button icon="check" label="Save" onClick={onSave} />
      </Navbar>

      <div className="row grow">
        <UserList
          users={users}
          currentId={currentId}
          onSelect={onSelect}
          loading={loading}
        />
        <UserForm userData={userData} setUserData={setUserData} />
        <Sessions userId={userData?.id} />
      </div>
    </main>
  )
}

export default UsersPage
