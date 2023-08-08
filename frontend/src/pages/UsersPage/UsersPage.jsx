import nebula from '/src/nebula'

import {useState, useEffect} from 'react'
import { 
  Navbar, 
  InputText, 
  Button, 
  Spacer, 
  Table, 
  Form, 
  FormRow, 
  InputSwitch, 
  Select 
} from '/src/components'

import Sessions from '/src/containers/Sessions'

const UserList = ({onSelect, currentId, reloadTrigger}) => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    nebula
      .request('user_list')
      .then((res) => {
        setUsers(res.data.users)
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

      <h4>{userData?.id ? userData.login : "New user"}</h4>

      <section className="column">
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
          <FormRow title="Administrator">
            <InputSwitch 
              value={userData?.is_admin || false}
              onChange={(value) => setValue('is_admin', value)}
            />
          </FormRow>
          <FormRow title="Local only">
            <InputSwitch 
              value={userData?.local_network_only || false}
              onChange={(value) => setValue('local_network_only', value)}
            />
          </FormRow>
        </Form>
      </section>

      <h4>Access control</h4>

      <section className="column">
        <Form>
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



      <section>
      <pre>
          {JSON.stringify(userData, null, 2)}
       </pre>
      </section>
    </div>
  )
}


const UsersPage = () => {
  const [userData, setUserData] = useState({})
  const [reloadTrigger, setReloadTrigger] = useState(0)

  const onSave = () => {
    nebula.request('save_user', userData)
      .then(() => {
        setUserData({})
        setReloadTrigger(reloadTrigger + 1)
      })
      .catch((err) => {
        console.error(err)
      })
  }

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
          currentId={userData?.id}
          reloadTrigger={reloadTrigger}
        />
        <UserForm userData={userData} setUserData={setUserData}/>
        {userData?.id && <Sessions userId={userData?.id}/>}
      </div>
    </main>
  )

}

export default UsersPage
