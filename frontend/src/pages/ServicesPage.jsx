import nebula from '/src/nebula'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import PubSub from '/src/pubsub'
import { Table, Button, InputSwitch, Spacer } from '/src/components'
import { Duration } from 'luxon'
import { setPageTitle } from '/src/actions'

const formatStatus = (rowData, key) => {
  const status = rowData[key]
  switch (status) {
    case 0:
      return <td>Stopped</td>
    case 1:
      return <td>Running</td>
    case 2:
      return <td>Starting</td>
    case 3:
      return <td>Stopping</td>
    case 4:
      return <td>Killing</td>
    default:
      return <td>Unknown</td>
  }
}

const formatLastSeen = (rowData, key) => {
  const lastSeen = rowData[key]
  if (lastSeen < 2) return <td>Now</td>

  if (lastSeen > 1234567890) return <td>Never</td>

  const duration = Duration.fromObject({ seconds: lastSeen })
  return <td>{duration.toHuman({ stripZeroUnits: 'all' })} ago </td>
}

const ServicesPage = () => {
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState([])
  const dispatch = useDispatch()

  const makeRequest = (action, id_service) => {
    const payload = {}
    if (action && id_service) {
      payload[action] = id_service
    }
    setLoading(true)
    nebula
      .request('services', payload)
      .then((response) => setServices(response.data.services))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    dispatch(setPageTitle({ title: 'Services' }))
    makeRequest()
  }, [])

  const formatAutoStart = (rowData, key) => {
    const autoStart = rowData[key] || false

    const onChange = () => {
      makeRequest('auto', rowData.id)
    }

    return (
      <td style={{ textAlign: 'center' }}>
        <Spacer>
          <InputSwitch
            value={autoStart}
            onChange={onChange}
            className="small"
          />
        </Spacer>
      </td>
    )
  }

  //eslint-disable-next-line
  const formatAction = (rowData, key) => {
    const status = rowData.status
    let b = null
    switch (status) {
      case 0:
        b = (
          <Button
            onClick={() => makeRequest('start', rowData.id)}
            label="Start"
          />
        )
        break
      case 1:
        b = (
          <Button
            onClick={() => makeRequest('stop', rowData.id)}
            label="Stop"
          />
        )
        break
      case 3:
        b = (
          <Button
            onClick={() => makeRequest('kill', rowData.id)}
            label="Kill"
          />
        )
        break
      default:
        b = <Button disabled={true} label="Please wait..." />
    }
    return <td className="action">{b}</td>
  }

  const columns = [
    { name: 'id', title: '#', width: 1 },
    { name: 'name', title: 'Name' },
    { name: 'type', title: 'Type', width: 200 },
    { name: 'hostname', title: 'Hostname', width: 200 },
    { name: 'status', title: 'Status', width: 200, formatter: formatStatus },
    {
      name: 'last_seen',
      title: 'Last seen',
      width: 300,
      formatter: formatLastSeen,
    },
    {
      name: 'autostart',
      title: 'Auto start',
      width: 70,
      formatter: formatAutoStart,
    },
    { name: 'action', title: 'Action', width: 150, formatter: formatAction },
  ]

  // get random number between 0 and 1000
  // this is used to force a reload of the table

  const handlePubSub = async (topic, message) => {
    setServices((prevData) => {
      const newData = [...prevData]
      const index = newData.findIndex((service) => service.id === message.id)
      if (index !== -1) {
        newData[index]['status'] = message.state
        newData[index]['last_seen'] = message.last_seen_before
        newData[index]['autostart'] = message.autostart
      }
      return newData
    })
  } // handlePubSub

  useEffect(() => {
    const token = PubSub.subscribe('service_state', handlePubSub)
    return () => PubSub.unsubscribe(token)
  }, [])

  return (
    <main>
      <section className="grow">
        <Table
          data={services}
          columns={columns}
          className="contained"
          keyField="id"
          loading={loading}
        />
      </section>
    </main>
  )
}

export default ServicesPage
