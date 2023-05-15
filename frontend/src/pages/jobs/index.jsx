import nebula from '/src/nebula'
import { useState, useEffect, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { useParams } from 'react-router-dom'
import { Table, Button, Timestamp } from '/src/components'
import { NavLink } from 'react-router-dom'
import { setPageTitle } from '/src/actions'

import JobsNav from './jobsNav'

const RESTARTABLE = ['conv']

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

const formatTitle = (rowData, key) => {
  return (
    <td>
      <NavLink to={`/mam/editor?asset=${rowData['id_asset']}`}>
        {rowData[key]}
      </NavLink>
    </td>
  )
}

const JobsPage = () => {
  const { view } = useParams()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const dispatch = useDispatch()

  const formatAction = (rowData, key) => {
    if ([0, 1, 5].includes(rowData['status']))
      return (
        <td className="action">
          <Button
            onClick={() => {
              nebula.request('jobs', { abort: rowData['id'] }).then(() => {
                loadJobs()
              })
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
            disabled={!RESTARTABLE.includes(rowData['service_type'])}
            label="Restart"
          />
        </td>
      )
    else return <td className="action">-</td>
  }

  const formatPriority = (rowData, key) => {
    const enabled = [0, 5].includes(rowData['status'])

    const setPriority = (priority) => {
      nebula.request('jobs', { priority: [rowData.id, priority] }).then(() => {
        loadJobs()
      })
    }

    const PRIORITIES = [
      { label: 'Hold', color: 'var(--color-violet)' },
      { label: 'Lowest', color: 'var(--color-magenta)' },
      { label: 'Low', color: 'var(--color-blue)' },
      { label: 'Normal', color: 'var(--color-green)' },
      { label: 'High', color: 'var(--color-yellow)' },
      { label: 'Highest', color: 'var(--color-red)' },
    ]

    if (!enabled) return <td>&nbsp;</td>

    return (
      <td onClick={() => setPriority((rowData.priority + 1) % 6)}>
        <span
          style={{
            color: PRIORITIES[rowData[key]].color,
            fontSize: '0.8rem',
            userSelect: 'none',
          }}
        >
          {PRIORITIES[rowData[key]].label}
        </span>
      </td>
    )
  }

  const COLUMNS = [
    { name: 'id', title: '#', width: 1 },
    { name: 'idec', title: 'IDEC', width: 1 },
    { name: 'asset_name', title: 'Asset', formatter: formatTitle },
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
      name: 'priority',
      title: 'Priority',
      width: 1,
      formatter: formatPriority,
    },
    {
      name: 'controls',
      title: '',
      className: 'job-controls',
      formatter: formatAction,
      width: 75,
    },
  ]

  const loadJobs = useCallback(() => {
    setLoading(true)
    const cleanTitle = view
      ? view[0].toUpperCase() + view.slice(1) + ' jobs'
      : 'Jobs'
    dispatch(setPageTitle({ title: cleanTitle }))
    nebula
      .request('jobs', { view, search_query: searchQuery })
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
    return () => {
      PubSub.unsubscribe(token)
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
