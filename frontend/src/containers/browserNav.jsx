import nebula from '/src/nebula'

import { Navbar, Button, Spacer, Dropdown, InputText } from '/src/components'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { debounce } from 'lodash'
import { setCurrentView, setSearchQuery } from '/src/actions'

const BrowserNav = () => {
  const dispatch = useDispatch()

  const currentView = useSelector((state) => state.context.currentView)
  const searchQuery = useSelector((state) => state.context.searchQuery)
  const [searchText, setSearchText] = useState(searchQuery)

  useEffect(() => {
    setSearchText(searchQuery)
  }, [searchQuery])

  const viewOptions = useMemo(() => {
    let result = []
    for (const view of nebula.settings.views || []) {
      result.push({
        label: view.name,
        onClick: () => dispatch(setCurrentView(view)),
      })
    }
    return result
  }, [])

  const debounceSetQuery = useCallback(
    debounce((q) => {
      dispatch(setSearchQuery(q))
    }, 200),
    []
  )

  useEffect(() => {
    debounceSetQuery(searchText)
  }, [searchText])

  const dropdownButtonStyle = {
    justifyContent: 'flex-start',
  }

  const navbar = useMemo(
    () => (
      <Navbar>
        <Dropdown
          options={viewOptions}
          label={currentView?.name}
          buttonStyle={dropdownButtonStyle}
        />
        <Spacer />
        <InputText
          placeholder="Search"
          onChange={setSearchText}
          value={searchText}
        />
        <Button
          icon="close"
          onClick={() => setSearchText('')}
          className="tool"
          tooltip="Clear search query"
        />
      </Navbar>
    ),
    [currentView?.name, searchText, viewOptions]
  )

  return navbar
}

export default BrowserNav
