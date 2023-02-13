import axios from 'axios'
import { useState } from 'react'
import {
  Select,
  Input,
  Button,
  Dialog,
  Switch,
  Form,
  FormRow,
  Table,
  Spacer,
} from '/src/components'

let options = []
for (let i = 0; i < 10; i++)
  options.push({ value: `option${i}`, title: `Option ${i}` })

const columns = [
  { name: 'foo', width: 300 },
  { name: 'bar', width: 200 },
  { name: 'baz', width: 200 },
]

let data = []
for (let i = 0; i < 30; i++)
  data.push({ foo: `Foo ${i}`, bar: `Bar ${i}`, baz: `Baz ${i}` })

const Dashboard = () => {
  const [showTable, setShowTable] = useState(false)

  const logout = () => {
    axios
      .post('logout')
      .then(() => (window.location.href = '/'))
      .catch((err) => console.log(err))
  }

  const dialogFooter = (
    <>
      <Spacer />
      <Button label="Log out" onClick={logout} />
      <Button label="Submit" />
    </>
  )

  return (
    <main className="row">
      <Dialog
        style={{ width: '70%' }}
        header="Nebula component library"
        footer={dialogFooter}
      >
        <Form>
          <FormRow title="User name">
            <Input placeholder="User name" />
          </FormRow>
          <FormRow title="Do you want to see a table?">
            <Switch
              checked={showTable}
              onChange={() => setShowTable(!showTable)}
            />
          </FormRow>
          {showTable && (
            <>
              <FormRow title="Table columns">
                <Select options={options} />
              </FormRow>
              <FormRow title="Table">
                <Table columns={columns} data={data} />
              </FormRow>
            </>
          )}
        </Form>
      </Dialog>
    </main>
  )
}

export default Dashboard
