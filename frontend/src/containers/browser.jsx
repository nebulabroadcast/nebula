import nebula from '/src/nebula'

import { Timecode } from '@wfoxall/timeframe'
import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Table, Timestamp, Navbar, Button, Spacer } from '/src/components'
import {
  setCurrentView,
  setSelectedAssets,
  setFocusedAsset,
} from '/src/actions'

import { useLocalStorage } from '/src/hooks'
import BrowserNav from './browserNav'
import './browser.sass'

const ROWS_PER_PAGE = 200

// Special fields formatters

const getQcStateClass = (state) => {
  switch (state) {
    case 3:
      return 'qc-state-rejected'
    case 4:
      return 'qc-state-accepted'
    default:
      return 'qc-state-new'
  }
}

const formatRowHighlightColor = (rowData) => {
  switch (rowData['status']) {
    case 0:
      return 'var(--color-red)'
    case 2:
      return 'var(--color-yellow)' // creating
    case 3:
      return 'var(--color-violet)' // trashed
    case 4:
      return 'var(--color-blue)' // archived
    case 5:
      return 'var(--color-yellow)' // reset
    case 6:
      return 'var(--color-red)' // corrupted
    case 11:
      return 'var(--color-yellow)' // retrieving
    default:
      return 'transparent'
  }
}

// Field formatters

const getFormatter = (key) => {
  if (['title', 'subtitle', 'description'].includes(key))
    return (rowData, key) => <td>{rowData[key]}</td>

  switch (key) {
    case 'qc/state':
      return (rowData, key) => (
        <td className={getQcStateClass(rowData[key])}>&#9873;</td>
      )

    case 'id_folder':
      return (rowData, key) => {
        const folder = nebula.settings.folders.find(
          (f) => f.id === rowData[key]
        )
        return <td style={{ color: folder?.color }}>{folder?.name}</td>
      }

    case 'duration':
      return (rowData, key) => {
        const fps = rowData['video/fps_f'] || 25
        const duration = rowData[key] || 0
        const timecode = new Timecode(duration * fps, fps)
        return <td>{timecode.toString().substring(0, 11)}</td>
      }

    case 'created_by':
      return (rowData, key) => {
        return <td>{nebula.getUserName(rowData[key])}</td>
      }

    case 'updated_by':
      return (rowData, key) => {
        return <td>{nebula.getUserName(rowData[key])}</td>
      }

    default:
      const metaType = nebula.metaType(key)
      switch (metaType.type) {
        case 'boolean':
          return (rowData, key) => <td>{rowData[key] ? '✓' : ''}</td>

        case 'datetime':
          return (rowData, key) => (
            <td>
              <Timestamp timestamp={rowData[key]} />{' '}
            </td>
          )

        case 'select':
          return (rowData, key) => {
            if (!metaType.cs) return <td>{rowData[key]}</td>

            const option = nebula
              .csOptions(metaType.cs)
              .find((opt) => opt.value === rowData[key])

            return <td>{option?.title}</td>
          }

        case 'list':
          return (rowData, key) => {
            if (!metaType.cs) return <td>{rowData[key].join(', ')}</td>
            const options = nebula
              .csOptions(metaType.cs)
              .filter((opt) => rowData[key].includes(opt.value))
            return <td>{options.map((opt) => opt.title).join(', ')}</td>
          }

        default:
          return (rowData, key) => <td>{rowData[key]}</td>
      } // switch metaType
  } // end switch key
} // end getFormatter

const Pagination = ({ page, setPage, hasMore }) => {
  if (page > 1 || hasMore)
    return (
      <Navbar>
        <Button
          icon="keyboard_arrow_left"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        />
        <Spacer>{page}</Spacer>
        <Button
          icon="keyboard_arrow_right"
          disabled={!hasMore}
          onClick={() => setPage(page + 1)}
        />
      </Navbar>
    )
  return null
}

const BrowserTable = () => {
  const currentView = useSelector((state) => state.context.currentView?.id)
  const searchQuery = useSelector((state) => state.context.searchQuery)
  const selectedAssets = useSelector((state) => state.context.selectedAssets)
  const browserRefresh = useSelector((state) => state.context.browserRefresh)

  const dispatch = useDispatch()

  const [columns, setColumns] = useState([])
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useLocalStorage('sortBy', 'ctime')
  const [sortDirection, setSortDirection] = useLocalStorage('sortDirection' ,'desc')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const loadData = () => {
    setLoading(true)
    nebula
      .request('browse', {
        view: currentView,
        query: searchQuery || '',
        limit: ROWS_PER_PAGE + 1,
        offset: page ? (page - 1) * ROWS_PER_PAGE : 0,
        order_by: sortBy,
        order_dir: sortDirection,
      })
      .then((response) => {
        const hasMore = response.data.data.length > ROWS_PER_PAGE
        setData(response.data.data.slice(0, ROWS_PER_PAGE))
        if (response.data.order_by !== sortBy) setSortBy(response.data.order_by)
        if (response.data.order_dir !== sortDirection)
          setSortDirection(response.data.order_dir)

        let cols = []
        for (const colName of response.data.columns)
          cols.push({
            name: colName,
            title: nebula.metaHeader(colName),
            formatter: getFormatter(colName),
          })
        setColumns(cols)
        setHasMore(hasMore)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!currentView) {
      if (nebula.settings.views.length) {
        dispatch(setCurrentView(nebula.settings.views[0]))
      }
      return
    }
    loadData()
  }, [currentView, searchQuery, browserRefresh, sortBy, sortDirection, page])

  const onRowClick = (rowData) => {
    dispatch(setSelectedAssets([rowData.id]))
    dispatch(setFocusedAsset(rowData.id))
  }

  return (
    <>
      <section className="grow">
        <Table
          data={data}
          columns={columns}
          className="contained"
          keyField="id"
          selection={selectedAssets}
          onRowClick={onRowClick}
          rowHighlightColor={formatRowHighlightColor}
          loading={loading}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={(sortBy, sortDirection) => {
            setSortBy(sortBy)
            setSortDirection(sortDirection)
          }}
        />
      </section>
      <Pagination page={page} setPage={setPage} hasMore={hasMore} />
    </>
  )
}

const Browser = () => {
  return (
    <>
      <BrowserNav />
      <BrowserTable />
    </>
  )
}

export default Browser
