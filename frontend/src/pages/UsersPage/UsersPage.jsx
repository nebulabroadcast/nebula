import nebula from '/src/nebula'

import { toast } from 'react-toastify'
import { useState, useEffect } from 'react'
import {
  Navbar,
  InputText,
  InputPassword,
  Button,
  Spacer,
  PanelHeader,
  Form,
  FormRow,
  InputSwitch,
  ScrollBox,
} from '/src/components'

import Sessions from '/src/containers/Sessions'
import UserList from './UserList'
import AccessControl from './AccessControl'
import ApiKeyPicker from './ApiKeyPicker'

const apiKeyPreview = (apiKey) => {
  const start = apiKey.substring(0, 4)
  const end = apiKey.substring(apiKey.length - 4)
  return start + '*******' + end
}

const UserForm = ({ userData, setUserData }) => {
  const setValue = (key, value) => {
    setUserData((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <ScrollBox>
      <section className="column">
        <PanelHeader>{userData?.id ? userData.login : 'New user'}</PanelHeader>
        <Form>
          <FormRow title="Login">
            <InputText
              value={userData?.login || ''}
              disabled={!!userData?.id}
              onChange={(value) => setValue('login', value)}
            />
          </FormRow>
          <FormRow title="Full name">
            <InputText
              value={userData?.full_name || ''}
              onChange={(value) => setValue('full_name', value)}
            />
          </FormRow>
          <FormRow title="Email">
            <InputText
              value={userData?.email || ''}
              onChange={(value) => setValue('email', value)}
            />
          </FormRow>
        </Form>
      </section>

      <section className="column">
        <PanelHeader>Authentication</PanelHeader>

        <Form>
          <FormRow title="Password">
            <InputPassword
              value={userData?.password || ''}
              onChange={(value) => setValue('password', value)}
              autoComplete="new-password"
              placeholder="Change current password"
            />
          </FormRow>
          <FormRow title="API Key">
            <ApiKeyPicker
              setApiKey={(value) => {
                setValue('api_key', value)
                setValue('api_key_preview', apiKeyPreview(value))
              }}
              apiKeyPreview={userData?.api_key_preview}
            />
          </FormRow>
          <FormRow title="Local network only">
            <InputSwitch
              value={userData?.local_network_only || false}
              onChange={(value) => setValue('local_network_only', value)}
            />
          </FormRow>
        </Form>
      </section>

      <AccessControl userData={userData} setValue={setValue} />

      {/*
      <section className="column">
        <pre>
          {JSON.stringify(userData, null, 2)}
        </pre>
      </section>
      */}
    </ScrollBox>
  )
}

const UsersPage = () => {
  const [userData, setUserData] = useState({})
  const [currentId, setCurrentId] = useState(null)
  const [reloadTrigger, setReloadTrigger] = useState(0)

  const onSave = () => {
    nebula
      .request('save_user', userData)
      .then(() => {
        setReloadTrigger(reloadTrigger + 1)
        toast.success('User saved')
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
    setUserData(copy)
  }

  useEffect(() => {
    if (userData?.id) setCurrentId(userData.id)
  }, [userData])

  return (
    <main className="column">
      <Navbar>
        <Button
          icon="person_add"
          label="New user"
          onClick={() => setUserData({})}
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
          onSelect={setUserData}
          currentId={currentId}
          reloadTrigger={reloadTrigger}
        />
        <UserForm userData={userData} setUserData={setUserData} />
        <Sessions userId={userData?.id} />
      </div>
    </main>
  )
}

export default UsersPage
