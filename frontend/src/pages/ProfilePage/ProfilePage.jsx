import nebula from '/src/nebula'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useState } from 'react'
import {
  Form,
  FormRow,
  Icon,
  InputText,
  InputPassword,
  Button,
  PanelHeader,
} from '/src/components'

import Sessions from '/src/containers/Sessions.jsx'

const ProfileForm = () => {
  const displayName = nebula.user.full_name || nebula.user.login

  return (
    <section className="column">
      <PanelHeader>
        <Icon icon="person" />
        {displayName}
      </PanelHeader>
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
      <PanelHeader>
        <Icon icon="security" />
        Change password
      </PanelHeader>
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
  const navigate = useNavigate()

  return (
    <section className="grow column">
      <PanelHeader>
        <Icon icon="admin_panel_settings" />
        Administration
      </PanelHeader>

      <div style={{ flexDirection: 'column', display: 'flex', maxWidth: 200 }}>
        <Button
          label="User management"
          icon="group"
          onClick={() => navigate('/users')}
        />
      </div>
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
