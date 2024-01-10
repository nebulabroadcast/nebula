import nebula from '/src/nebula'
import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import { Table, Navbar, Button, Spacer } from '/src/components'
import {
  setCurrentView,
  setSelectedAssets,
  setFocusedAsset,
} from '/src/actions'

import { useLocalStorage } from '/src/hooks'
import BrowserNav from './BrowserNav'
import { getColumnWidth, getFormatter, formatRowHighlightColor } from './Formatting.jsx'

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
            width: getColumnWidth(colName),
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
