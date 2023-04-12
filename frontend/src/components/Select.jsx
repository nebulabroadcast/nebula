import { useState, useMemo } from 'react'
import styled from 'styled-components'

import InputText from './InputText'
import Button from './Button'
import SelectDialog from './SelectDialog'

import defaultTheme from './theme'


// Styled dialog-based select component.

const DialogBasedSelect = styled.div`
  // pseudo-input element
  display: flex;
  flex-direction: row;
  gap: 4px;
  min-width: 200px;

  .select-field {
    flex-grow: 1;

    border: 0;
    border-radius: 4px;
    background-color: ${(props) => props.theme.colors.surface04};
    color: ${(props) => props.theme.colors.text};
    min-height: ${(props) => props.theme.inputHeight};
    font-size: ${(props) => props.theme.fontSize};
    padding-left: 5px;
    padding-right: 5px;
    position: relative;
    display: flex;
    align-items: center;

    span {
      position: absolute;
      width: 95%;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      &.placeholder {
        color: ${(props) => props.theme.colors.textDimmer};
        font-size: 0.9rem;
      }
    }
  }

  // TODO: move to separate component

  .scroll-box {
    flex-grow: 1;
    position: relative;

    .scroll-box-cont {
      position: relative;
      max-height: 400px;
      overflow-y: scroll;
      overflow-x: auto;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
  }
`
DialogBasedSelect.defaultProps = {
  theme: defaultTheme,
}

// When there is just a few items in the list, we can use a dropdown.

const StyledHTMLSelect = styled.select`
  border: 0;
  border-radius: ${(props) => props.theme.inputBorderRadius};
  background: ${(props) => props.theme.inputBackground};
  color: ${(props) => props.theme.colors.text};
  min-height: ${(props) => props.theme.inputHeight};
  font-size: ${(props) => props.theme.fontSize};
  padding-left: ${(props) => props.theme.inputPadding};
  padding-right: ${(props) => props.theme.inputPadding};
  min-width: 200px;

  &:focus {
    outline: 1px solid ${(props) => props.theme.colors.cyan};
  }

  &:hover {
    color: ${(props) => props.theme.colors.text};
  }

  &:invalid,
  &.error {
    outline: 1px solid ${(props) => props.theme.colors.red} !important;
  }
`
StyledHTMLSelect.defaultProps = {
  theme: defaultTheme,
}

const Select = ({
  options,
  value,
  onChange,
  placeholder,
  selectionMode = 'single',
}) => {
  const [dialogVisible, setDialogVisible] = useState(false)

  const displayValue = useMemo(() => {
    let result = []
    if (!value) return
    for (const opt of options) {
      if (selectionMode === 'single' && value === opt.value) {
        result.push(opt.title)
        break
      } else if (selectionMode === 'multiple' && value.includes(opt.value))
        result.push(opt.title)
    }
    return result.join(', ')
  }, [options, value])

  const onDialogClose = (value) => {
    onChange(value)
    setDialogVisible(false)
  }

  let dialog = useMemo(() => {
    if (!dialogVisible) return <></>
    return (
      <SelectDialog
        options={options}
        selectionMode={selectionMode}
        initialValue={value}
        onHide={onDialogClose}
      />
    )
  }, [dialogVisible])

  if (selectionMode === 'single' && options.length < 10) {
    return (
      <StyledHTMLSelect
        value={value || ''}
        onChange={(e) => {
          onChange(e.target.value || null)
        }}
      >
        <option value={null}></option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.title}
          </option>
        ))}
      </StyledHTMLSelect>
    )
  }

  return (
    <DialogBasedSelect>
      {dialog}
      <InputText
        value={displayValue}
        placeholder={placeholder}
        readonly={true}
        style={{ flexGrow: 1 }}
        onDoubleClick={() => setDialogVisible(true)}
        onChange={()=>{}}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setDialogVisible(true)
        }}
      />
      <Button label="..." onClick={() => setDialogVisible(true)} />
    </DialogBasedSelect>
  )
}

export default Select
