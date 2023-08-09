import nebula from '/src/nebula'
import styled from 'styled-components'

import {toast} from 'react-toastify'
import {useState, useEffect} from 'react'
import { 
  Navbar, 
  InputText, 
  InputPassword,
  Button, 
  Spacer, 
  Form, 
  FormRow, 
  InputSwitch, 
  Select 
} from '/src/components'

import Sessions from '/src/containers/Sessions'
import UserList from './UserList'


const PanelHeader = styled.h2`
  padding: 0;
  padding-bottom: 10px;
  margin: 0;
  margin-bottom: 10px;
  border-bottom: 1px solid #514a5e;
  font-size: 18px;
`


const AllOrList = ({value, setValue, options }) => {
  const [all, setAll] = useState(false)
  const [values, setValues] = useState([])

  useEffect(() => {
    if (value === true) {
      setAll(true)
    }
    else if (value === false) {
      setAll(false)
      setValues([])
      }
    else {
      setAll(false)
      setValues(value)
    }
  }, [value])

  return (
    <div className="row" style={{flexGrow: 1, gap: 12, alignItems: "center"}}>
      <Select 
        options={options} 
        value={values} 
        onChange={(v) => {
          const m = v.map((i) => parseInt(i))
          setValues(m)
          setValue(m.length === 0 ? false : m)
        }} 
        disabled={all} 
        selectionMode="multiple"
        style={{flexGrow: 1}}
      />

      All

      <InputSwitch 
        value={all} 
        onChange={(v) => {
          setAll(v)
          setValue(v ? true : values)
        }} 
        title="All"
      />
    </div>
  )
}



const UserForm = ({userData, setUserData}) => {
  const folderOptions = nebula.settings.folders.map((folder) => (
    {title: folder.name, value: folder.id}
  ))

  const setValue = (key, value) => {
    setUserData((prev) => ({...prev, [key]: value}))
  }

  return (
    <div className="invisible column grow">


      <section className="column">
        <PanelHeader>
          {userData?.id ? userData.login : "New user"}
        </PanelHeader>
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
              value={userData?.password || ""}
              onChange={(value) => setValue('password', value)}
              autocomplete="new-password"
              placeholder="Change current password"
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

      <section className="column">
        <PanelHeader>
          Access control
        </PanelHeader>
        <Form>
          <FormRow title="Administrator">
            <InputSwitch 
              value={userData?.is_admin || false}
              onChange={(value) => setValue('is_admin', value)}
            />
          </FormRow>
          <FormRow title="Limited">
            <InputSwitch 
              value={userData?.is_limited || false}
              onChange={(value) => setValue('is_limited', value)}
            />
          </FormRow>
          <FormRow title="Asset view">
            <AllOrList 
              value={userData?.can_asset_view || false} 
              setValue={(value) => setValue('can_asset_view', value)}
              options={folderOptions}
            />
          </FormRow>
          <FormRow title="Asset edit">
            <AllOrList 
              value={userData?.can_asset_edit || false} 
              setValue={(value) => setValue('can_asset_edit', value)}
              options={folderOptions}
            />
          </FormRow>
        </Form>
      </section>
    </div>
  )
}


const UsersPage = () => {
  const [userData, setUserData] = useState({})
  const [currentId, setCurrentId] = useState(null)
  const [reloadTrigger, setReloadTrigger] = useState(0)

  const onSave = () => {
    nebula.request('save_user', userData)
      .then(() => {
        setReloadTrigger(reloadTrigger + 1)
        toast.success('User saved')
      })
      .catch((err) => {
        toast.error('Error saving user')
        console.error(err)
      })
      .finally(() => {
        setUserData((data) => ({...data, password: undefined}))
      })
  }

  useEffect(() => {
    if (userData?.id)
      setCurrentId(userData.id)
  }, [userData])

  return (
    <main className="column">
      <Navbar>
        <Button 
          icon="add" 
          label="New user" 
          onClick={() => setUserData({})}
        />
        <Spacer />
        <Button icon="check" label="Save" onClick={onSave}/>
      </Navbar>

      <div className="row grow">
        <UserList 
          onSelect={setUserData} 
          currentId={currentId}
          reloadTrigger={reloadTrigger}
        />
        <UserForm userData={userData} setUserData={setUserData}/>
        {userData?.id && <Sessions userId={userData?.id}/>}
      </div>
    </main>
  )

}

export default UsersPage
