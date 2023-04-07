import nebula from '/src/nebula'
import { useState, useEffect, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { useParams } from 'react-router-dom'
import { Table, Button, Timestamp } from '/src/components'
import { setPageTitle } from '/src/actions'

import JobsNav from './jobsNav'

const formatAction = (rowData, key) => {
  if ([0, 1, 5].includes(rowData['status']))
    return (
      <td className="action">
        <Button
          onClick={() => {
            nebula.request('jobs', { abort: rowData['id'] })
          }}
          label="Abort"
        />
      </td>
    )
  else if ([2, 3, 4, 6].includes(rowData['status']))
    return (
      <td className="action">
        <Button
          onClick={() => {
            nebula.request('jobs', { restart: rowData['id'] })
          }}
          label="Restart"
        />
      </td>
    )
  else return <td className="action">-</td>
}

const formatTime = (rowData, key) => {
  const timestamp = rowData[key]
  if (!timestamp)
    return (
      <td>
        <hr />
      </td>
    )
  return (
    <td>
      <Timestamp timestamp={timestamp} />
    </td>
  )
}

const COLUMNS = [
  { name: 'id', title: '#', width: 1 },
  { name: 'asset_name', title: 'Asset' },
  { name: 'action_name', title: 'Action' },
  { name: 'service_name', title: 'Service' },
  {
    name: 'ctime',
    title: 'Created',
    className: 'time',
    formatter: formatTime,
    width: 150,
  },
  {
    name: 'stime',
    title: 'Started',
    className: 'time',
    formatter: formatTime,
    width: 150,
  },
  {
    name: 'etime',
    title: 'Finished',
    className: 'time',
    formatter: formatTime,
    width: 150,
  },
  { name: 'message', title: 'Message', className: 'job-message', width: 400 },
  {
    name: 'controls',
    title: '',
    className: 'job-controls',
    formatter: formatAction,
    width: 75,
  },
]

const jobs = []
for (let idx = 0; idx < 10; idx++) {
  jobs.push({
    id: idx,
    asset_title: `Asset ${idx}`,
    progress: Math.floor(Math.random() * 100),
  })
}

const JobsPage = () => {
  const { view } = useParams()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const dispatch = useDispatch()

  const loadJobs = useCallback(() => {
    setLoading(true)
    const cleanTitle = view
      ? view[0].toUpperCase() + view.slice(1) + ' jobs'
      : 'Jobs'
    dispatch(setPageTitle({ title: cleanTitle }))
    nebula
      .request('jobs', { view, searchQuery })
      .then((response) => {
        setJobs(response.data.jobs)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [searchQuery, view])

  useEffect(() => {
    loadJobs()
  }, [jobs.map((job) => job.status).join(','), view, searchQuery])

  const handlePubSub = (topic, message) => {
    setJobs((prevData) => {
      const newData = [...prevData]
      const index = newData.findIndex((job) => job.id === message.id)
      if (index !== -1) {
        newData[index]['status'] = message.status
        newData[index]['progress'] = message.progress
        newData[index]['message'] = message.message
      }
      return newData
    })
  } // handlePubSub

  useEffect(() => {
    const token = PubSub.subscribe('job_progress', handlePubSub)
    //setInterval(() => {console.log("GGG"); loadJobs() }, 3000)
    return () => {
      PubSub.unsubscribe(token)
      //clearInterval(loadJobs)
    }
  }, [view, searchQuery])

  return (
    <main className="column">
      <JobsNav searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <section className="grow">
        <Table
          columns={COLUMNS}
          className="contained"
          data={jobs}
          loading={loading}
        />
      </section>
    </main>
  )
}

export default JobsPage
