import nebula from '/src/nebula'
import { useEffect, useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { toast } from 'react-toastify'
import { debounce } from 'lodash'

import { Table } from '/src/components'
import Pagination from '/src/containers/Pagination'

import {
  setCurrentView,
  setSelectedAssets,
  setFocusedAsset,
  showSendToDialog,
} from '/src/actions'

import { useLocalStorage, useConfirm } from '/src/hooks'
import BrowserNav from './BrowserNav'
import {
  getColumnWidth,
  getFormatter,
  formatRowHighlightColor,
} from './Formatting.jsx'

const ROWS_PER_PAGE = 200

const BrowserTable = () => {
  const currentView = useSelector((state) => state.context.currentView?.id)
  const searchQuery = useSelector((state) => state.context.searchQuery)
  const selectedAssets = useSelector((state) => state.context.selectedAssets)
  const focusedAsset = useSelector((state) => state.context.focusedAsset)

  const dispatch = useDispatch()

  const [columns, setColumns] = useState([])
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useLocalStorage('sortBy', 'ctime')
  const [sortDirection, setSortDirection] = useLocalStorage(
    'sortDirection',
    'desc'
  )
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [ConfirmDialog, confirm] = useConfirm()

  const dataRef = useRef(data)
  const requestParamsRef = useRef(null)

  //
  // References
  //

  useEffect(() => {
    // Save the data to a ref - it is used by the pubsub event handler
    // to match the changed objects with the current data
    dataRef.current = data
  }, [data])

  useEffect(() => {
    // User changed view or search query
    if (!currentView) {
      // No view selected, load the first available view
      if (nebula.settings.views.length) {
        dispatch(setCurrentView(nebula.settings.views[0]))
      }
      return
    }

    // Save the request params - we will use them to load the data
    // when objects are changed externally

    requestParamsRef.current = {
      view: currentView,
      query: searchQuery || '',
      limit: ROWS_PER_PAGE + 1,
      offset: page ? (page - 1) * ROWS_PER_PAGE : 0,
      order_by: sortBy,
      order_dir: sortDirection,
    }

    // show loading indicator only if the user initiated the refresh
    setLoading(true)
    loadData()
  }, [currentView, searchQuery, sortBy, sortDirection, page])

  useEffect(() => {
    // Reset page when view or search query changes
    setPage(1)
  }, [currentView, searchQuery, sortBy, sortDirection])

  //
  // Data loading
  //

  const loadData = () => {
    // Use current value of requestParamsRef to avoid stale data
    const params = requestParamsRef.current
    nebula
      .request('browse', params)
      .then((response) => {
        const hasMore = response.data.data.length > ROWS_PER_PAGE
        const rows = response.data.data.slice(0, ROWS_PER_PAGE)
        setData(rows)
        if (response.data.order_by !== sortBy) setSortBy(response.data.order_by)
        if (response.data.order_dir !== sortDirection)
          setSortDirection(response.data.order_dir)

        let cols = []
        for (const colName of response.data.columns)
          cols.push({
            name: colName,
            title: nebula.metaHeader(colName),
            formatter: getFormatter(colName),
            width: getColumnWidth(colName),
          })
        setColumns(cols)
        setHasMore(hasMore)
      })
      .finally(() => setLoading(false))
  }

  // Debounce the loadData function to avoid multiple requests
  // when multiple objects are changed at the same time
  const debouncingLoadData = debounce(loadData, 100)

  //
  // Subscribe to objects_changed pubsub event
  //

  const handlePubSub = (topic, message) => {
    if (topic !== 'objects_changed') return
    if (message.object_type !== 'asset') return
    let changed = false
    for (const obj of message.objects) {
      if (dataRef.current.find((row) => row.id === obj)) {
        changed = true
        break
      }
    }
    if (changed) {
      debouncingLoadData()
    }
  }

  useEffect(() => {
    // eslint-disable-next-line no-undef
    const token = PubSub.subscribe('objects_changed', handlePubSub)
    // eslint-disable-next-line no-undef
    return () => PubSub.unsubscribe(token)
  }, [])

  //
  // User interaction
  //

  const onRowClick = (rowData, event) => {
    let newSelectedAssets = []
    if (event.ctrlKey) {
      if (selectedAssets.includes(rowData.id)) {
        newSelectedAssets = selectedAssets.filter((obj) => obj !== rowData.id)
      } else {
        newSelectedAssets = [...selectedAssets, rowData.id]
      }
    } else if (event.shiftKey) {
      const clickedIndex = data.findIndex((row) => row.id === rowData.id)
      const focusedIndex =
        data.findIndex((row) => row.id === focusedAsset) ||
        data.findIndex((row) => selectedAssets.includes(row.id)) ||
        clickedIndex ||
        0

      const min = Math.min(clickedIndex, focusedIndex)
      const max = Math.max(clickedIndex, focusedIndex)

      // Get the ids of the rows in the range
      const rangeIds = data.slice(min, max + 1).map((row) => row.id)

      newSelectedAssets = [...new Set([...selectedAssets, ...rangeIds])]
    } else {
      newSelectedAssets = [rowData.id]
    }

    dispatch(setSelectedAssets(newSelectedAssets))
    dispatch(setFocusedAsset(rowData.id))
  }

  const focusNext = (offset) => {
    if (!focusedAsset) return
    const nextIndex = data.findIndex((row) => row.id === focusedAsset) + offset
    if (nextIndex < data.length) {
      const nextRow = data[nextIndex]
      dispatch(setSelectedAssets([nextRow.id]))
      dispatch(setFocusedAsset(nextRow.id))
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      focusNext(1)
      e.preventDefault()
    }
    if (e.key === 'ArrowUp') {
      focusNext(-1)
      e.preventDefault()
    }
  }

  const setSelectionStatus = async (status, question) => {
    // Change asset status of the selected assets
    if (question) {
      const ans = await confirm('Are you sure?', question)
      if (!ans) return
    }

    const operations = selectedAssets.map((id) => ({
      id,
      data: { status },
    }))
    nebula
      .request('ops', { operations })
      .then(() => {
        toast.success('Status updated')
        //dispatch(reloadBrowser())
      })
      .catch((error) => {
        console.error(error)
        toast.error(error.response?.detail)
      })
  }

  const contextMenu = () => [
    {
      label: 'Send to...',
      icon: 'send',
      onClick: () => dispatch(showSendToDialog()),
    },
    {
      label: 'Reset',
      icon: 'undo',
      onClick: () =>
        setSelectionStatus(
          5,
          'Do you want to reload selected assets metadata?'
        ),
    },
    {
      label: 'Archive',
      separator: true,
      icon: 'archive',
      onClick: () =>
        setSelectionStatus(
          4,
          'Do you want to move selected assets to archive?'
        ),
    },
    {
      label: 'Trash',
      icon: 'delete',
      onClick: () =>
        setSelectionStatus(3, 'Do you want to move selected assets to trash?'),
    },
  ]

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
          onKeyDown={onKeyDown}
          rowHighlightColor={formatRowHighlightColor}
          loading={loading}
          sortBy={sortBy}
          sortDirection={sortDirection}
          contextMenu={contextMenu}
          onSort={(sortBy, sortDirection) => {
            setSortBy(sortBy)
            setSortDirection(sortDirection)
          }}
        />
      </section>
      <Pagination page={page} setPage={setPage} hasMore={hasMore} />
      <ConfirmDialog />
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
