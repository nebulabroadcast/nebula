import nebula from '/src/nebula'

import { useMemo } from 'react'

import { Form, FormRow, Select } from '/src/components'
import { InputText, TextArea, InputDatetime } from '/src/components/input'

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
      editor = (
        <InputText
          value={value}
          onChange={onChange}
          placeholder={metaType.description}
        />
      )
      break
    case 'text':
      editor = (
        <TextArea
          value={value}
          onChange={onChange}
          placeholder={metaType.description}
        />
      )
      break
    case 'select':
      editor = (
        <Select
          options={options}
          value={value}
          selectionMode="single"
          onChange={onChange}
          placeholder={metaType.description}
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
          placeholder={metaType.description}
        />
      )
      break
    case 'datetime':
      editor = (
        <InputDatetime
          value={value}
          onChange={onChange}
          placeholder={metaType.description}
        />
      )
      break
    default:
      editor = <InputText value={value} onChange={onChange} disabled={true} />
  }

  return (
    <FormRow
      title={`${metaType.title}${changed ? ' *' : ''}`}
      tooltip={metaType.description}
    >
      {editor}
    </FormRow>
  )
}

const EditorForm = ({ originalData, assetData, setAssetData, fields }) => {
  const onFieldChanged = (key, value) =>
    setAssetData((o) => {
      return { ...o, [key]: value }
    })

  return (
    <Form>
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
