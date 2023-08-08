import { useState, useMemo, useRef, useEffect } from 'react'

import Dialog from './Dialog'
import InputText from './InputText'
import Button from './Button'

import { DialogButtons } from './Layout'
import { sortByKey } from '/src/utils'
import styled from 'styled-components'
import defaultTheme from './theme'

const BaseOption = styled.div`
  padding: 3px;
  cursor: pointer;
  white-space: nowrap;
  background-color: ${(props) => props.theme.colors.surface05};

  &.selected {
    background-color: ${(props) => props.theme.colors.violet};
  }

  &.label {
    font-weight: bold;
    background-color: ${(props) => props.theme.colors.surface03};
  }

  &.header {
    font-weight: bold;
  }
`
BaseOption.defaultProps = {
  theme: defaultTheme,
}

const Option = ({ option, selected, onClick }) => {
  const classes = []
  if (selected) classes.push('selected')
  if (option.role === 'label') classes.push('label')
  return (
    <BaseOption
      className={classes.join(' ')}
      style={{ paddingLeft: option.level * 15 }}
      onClick={option.role === 'label' ? undefined : onClick}
      title={option.description}
    >
      {option.title}
    </BaseOption>
  )
}

function filterHierarchy(array, query, currentSelection) {
  const queryLower = query.toLowerCase()
  const result = []
  const set = new Set()
  for (const item of array) {
    if (typeof item.value !== 'string')
      item.level = 1
    else
      item.level = item.value.split('.').length
    if (
      item.title.toLowerCase().includes(queryLower) ||
      item.value in currentSelection
    ) {
      if (item.role === 'hidden') {
        continue
      }
      result.push(item)
      set.add(item.value)
      let value = item.value
      while (value) {
        const parts = typeof value === 'string' ? value.split('.') : [value]
        if (parts.length === 1) {
          value = ''
        } else {
          parts.pop()
          value = parts.join('.')
          const parent = array.find((i) => i.value === value)
          if (item.role !== 'hidden' && parent && !set.has(parent.value)) {
            result.push(parent)
            set.add(parent.value)
          }
        }
      }
    }
  }
  return sortByKey(result, 'value')
}

const SelectDialog = ({ options, onHide, selectionMode, initialValue }) => {
  const [filter, setFilter] = useState('')
  const [selection, setSelection] = useState({})

  // Cannot be used rn - InputText does not support forwardRef yet
  const filterRef = useRef(null)
  useEffect(() => {
    if (filterRef.current) {
      filterRef.current.focus()
    }
  }, [filterRef.current])

  // Create the selection object from the given initial Value.

  useEffect(() => {
    if (selectionMode === 'single') {
      setSelection({ [initialValue]: true })
      return
    }
    const result = {}
    for (const r of initialValue || []) result[r] = true
    setSelection(result)
  }, [initialValue])

  const filteredOptions = useMemo(() => {
    return filterHierarchy(options, filter, selection)
  }, [options, filter, selection])

  const onToggle = (key) => {
    setSelection((os) => {
      if (selectionMode === 'single') return { [key]: true }
      const result = { ...os }
      result[key] = !os[key]
      return result
    })
  }

  const onClose = () => {
    onHide(initialValue)
  }

  const onUnset = () => {
    onHide(null)
  }

  const onApply = () => {
    let value = Object.keys(selection).filter((key) => selection[key])
    if (selectionMode === 'single') value = value.length ? value[0] : null
    onHide(value)
  }

  return (
    <Dialog onHide={() => onClose()} style={{ minWidth: 400 }}>
      <InputText
        placeholder="Filter"
        value={filter}
        onChange={setFilter}
        ref={filterRef}
      />

      <div className="scroll-box">
        <div className="scroll-box-cont">
          {filteredOptions.map((option) => (
            <Option
              key={option.value}
              option={option}
              selected={selection[option.value]}
              onClick={() => onToggle(option.value)}
            />
          ))}
        </div>
      </div>
      <DialogButtons>
        <Button onClick={() => onUnset()} label="Unset" icon="backspace" />
        <Button onClick={() => onClose()} label="Cancel" icon="close" />
        <Button onClick={() => onApply()} label="Apply" icon="check" />
      </DialogButtons>
    </Dialog>
  )
}

export default SelectDialog
