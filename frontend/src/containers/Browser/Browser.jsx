import nebula from '/src/nebula'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { toast } from 'react-toastify'
import { debounce } from 'lodash'

import { Table, Navbar, Button, Spacer } from '/src/components'
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
  const focusedAsset = useSelector((state) => state.context.focusedAsset)
  const browserRefresh = useSelector((state) => state.context.browserRefresh)

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

  useEffect(() => {
    dataRef.current = data;
  }, [data])

  const loadData = () => {
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
            width: getColumnWidth(colName),
          })
        setColumns(cols)
        setHasMore(hasMore)
      })
      .finally(() => setLoading(false))
  }

  const debouncingLoadData = useCallback(debounce(loadData, 100), [loadData])

  const handlePubSub = useCallback((topic, message) => {
    if (topic !== 'objects_changed') return
    if (message.object_type !== 'asset') return
    let changed = false
    for (const obj of message.objects) {
      if (dataRef.current.find((row) => row.id === obj)) {
        changed = true;
        break;
      }
    }
    if (changed){
      debouncingLoadData()
    }
  }, [loadData])

  useEffect(() => {
    const token = PubSub.subscribe('objects_changed', handlePubSub)
    return () => PubSub.unsubscribe(token)
  }, [])

  useEffect(() => {
    if (!currentView) {
      if (nebula.settings.views.length) {
        dispatch(setCurrentView(nebula.settings.views[0]))
      }
      return
    }
    setLoading(true) // show loading indicator only if the user initiated the refresh
    loadData()
  }, [currentView, searchQuery, browserRefresh, sortBy, sortDirection, page])

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

  const contextMenu = () => {
    const items = [
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
          setSelectionStatus(
            3,
            'Do you want to move selected assets to trash?'
          ),
      },
    ]
    return items
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
