import nebula from '/src/nebula'
import { toast } from 'react-toastify'
import { useEffect, useState } from 'react'
import {
  Form,
  FormRow,
  InputText,
  Button,
  Table,
  Timestamp,
} from '/src/components'

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

const Sessions = () => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    nebula
      .request('sessions', { id_user: nebula.user.id })
      .then((res) => {
        setSessions(res.data)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="column" style={{ minWidth: 500 }}>
      <h1>Sessions</h1>
      <Table
        data={sessions}
        loading={loading}
        keyField="token"
        columns={[
          {
            name: 'client_info',
            title: 'Client info',
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

const ProfileForm = () => {
  const displayName = nebula.user.full_name || nebula.user.login

  return (
    <section className="column">
      <h1>Profile: {displayName}</h1>

      <Form>
        <FormRow title="Login">
          <InputText value={nebula.user.login} disabled />
        </FormRow>
        <FormRow title="Full name">
          <InputText value={nebula.user.full_name} disabled />
        </FormRow>
        <FormRow title="Email">
          <InputText value={nebula.user.email} disabled />
        </FormRow>
        <FormRow>
          <Button label="Save" icon="check" disabled />
        </FormRow>
      </Form>
    </section>
  )
}

const ChangePasswordForm = () => {
  const [password, setPassword] = useState('')
  const [passwordRepeat, setPasswordRepeat] = useState('')

  const changePassword = () => {
    if (password !== passwordRepeat) {
      toast.error('Passwords do not match')
      return
    }

    nebula
      .request('password', { password })
      .then(() => {
        toast.success('Password changed')
        setPassword('')
        setPasswordRepeat('')
      })
      .catch((err) => {
        const msg = err.response?.data?.detail || err.message
        toast.error(msg)
      })
  }

  return (
    <section className="column">
      <h2>Change password</h2>
      <Form>
        <FormRow title="New password">
          <InputText type="password" value={password} onChange={setPassword} />
        </FormRow>
        <FormRow title="Repeat new password">
          <InputText
            type="password"
            value={passwordRepeat}
            onChange={setPasswordRepeat}
          />
        </FormRow>
        <FormRow>
          <Button
            label="Change password"
            icon="check"
            onClick={changePassword}
          />
        </FormRow>
      </Form>
    </section>
  )
}

const ProfilePage = () => {
  return (
    <main>
      <div className="column" style={{ minWidth: 400 }}>
        <ProfileForm />
        <ChangePasswordForm />
      </div>
      <section className="grow column">
        <h1>Access control</h1>
        {nebula.user.is_admin && (
          <p>You are an administrator. You can do whatever you want</p>
        )}
      </section>

      <Sessions />
    </main>
  )
}

export default ProfilePage
