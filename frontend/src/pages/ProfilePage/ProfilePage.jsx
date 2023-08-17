import nebula from '/src/nebula'
import { toast } from 'react-toastify'
import { useState } from 'react'
import {
  Form,
  FormRow,
  InputText,
  InputPassword,
  Button,
} from '/src/components'


import Sessions from '/src/containers/Sessions.jsx'



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
          <InputPassword 
            value={password} 
            onChange={setPassword} 
            autoComplete="new-password"
          />
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


const AdminPanel = () => {
  return (
    <section className="grow column">
      <h2>Administration</h2>
      Remember; with great power comes great responsibility.

      <ul>
        <li><a href="/users">User management</a></li>
      </ul>

    </section>
  )
}

const UserPanel = () => {
  return (
    <section className="grow column">
      <h2>Access control</h2>
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

      {nebula.user.is_admin ? <AdminPanel /> : <UserPanel />}

      <Sessions userId={nebula.user.id} />
    </main>
  )
}

export default ProfilePage
