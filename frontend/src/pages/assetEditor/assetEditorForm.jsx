import nebula from '/src/nebula'

import { useMemo } from 'react'

import { Form, FormRow, Select } from '/src/components'
import { InputText, InputInteger, TextArea, InputDatetime, InputSwitch } from '/src/components'

const EditorField = ({ field, value, originalValue, onFieldChanged }) => {
  const metaType = { ...nebula.metaType(field.name), ...field }

  const options = useMemo(() => {
    if (!metaType.cs) return []

    if (metaType.filter) {
      return nebula
        .csOptions(metaType.cs)
        .filter(
          (opt) => opt.value.match(metaType.filter) || opt.value === value
        )
    }
    return nebula.csOptions(metaType.cs)
  }, [metaType])

  const originalValueParsed = useMemo(() => {
    if (originalValue) return originalValue
    if (metaType.default) return metaType.default

    switch (metaType.type) {
      case 'string':
        return ''
      case 'number':
        return 0
      case 'boolean':
        return false
      default:
        return undefined
    }
  }, [originalValue, metaType])

  // muhehe
  const changed = !(!originalValue && !value) && originalValueParsed !== value

  const onChange = (value) => {
    onFieldChanged(field.name, value)
  }

  let editor
  switch (metaType.type) {
    case 'string':
      editor = <InputText value={value} onChange={onChange} />
      break
    case 'text':
      editor = <TextArea value={value} onChange={onChange} />
      break
    case 'select':
      editor = (
        <Select
          options={options}
          value={value}
          selectionMode="single"
          onChange={onChange}
        />
      )
      break
    case 'list':
      editor = (
        <Select
          options={options}
          value={value}
          selectionMode="multiple"
          onChange={onChange}
        />
      )
      break
    case 'datetime':
      editor = <InputDatetime value={value} onChange={onChange} />
      break
    case 'boolean':
      editor = <InputSwitch value={value} onChange={onChange} />
      break
    case 'integer':
      editor = <InputInteger value={value} onChange={onChange} />
      break
    default:
      editor = <InputText value={value} onChange={onChange} disabled={true} />
  }

  return (
    <FormRow
      title={`${metaType.title}${changed ? ' *' : ''}`}
      tooltip={metaType.description}
      section={metaType.section}
    >
      {editor}
    </FormRow>
  )
}

const EditorForm = ({
  originalData,
  assetData,
  setAssetData,
  fields,
  onSave,
}) => {
  const onFieldChanged = (key, value) =>
    setAssetData((o) => {
      return { ...o, [key]: value }
    })

  function handleKeyDown(event) {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault() // prevent default browser behavior (saving the page)
      onSave()
    }
  }

  return (
    <Form onKeyDown={handleKeyDown}>
      {fields.map((field) => (
        <EditorField
          key={field.name}
          field={field}
          value={assetData[field.name]}
          originalValue={originalData[field.name]}
          onFieldChanged={onFieldChanged}
        />
      ))}
    </Form>
  )
}

export default EditorForm
