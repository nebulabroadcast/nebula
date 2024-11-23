import { createContext, useState, useRef, useContext } from 'react'
import styled from 'styled-components'

import { Button, Dialog } from '/src/components'
import MetadataEditor from '/src/containers/MetadataEditor'

const MetadataDialogContext = createContext()

const MetadataDialog = ({
  title,
  fields,
  initialData,
  handleCancel,
  handleConfirm,
}) => {
  const [data, setData] = useState(initialData)
  const handleReset = () => setData(initialData)

  const onConfirm = () => {
    handleConfirm(data)
  }

  const footer = (
    <>
      <Button onClick={handleReset} label="Reset" icon="backspace" />
      <Button onClick={handleCancel} label="Cancel" icon="close" />
      <Button onClick={onConfirm} label="Save" icon="check" />
    </>
  )

  return (
    <Dialog onHide={handleCancel} header={title} footer={footer}>
      <MetadataEditor
        originalData={initialData}
        objectData={data}
        setObjectData={setData}
        fields={fields}
        onSave={onConfirm}
      />
    </Dialog>
  )
}

export const MetadataDialogProvider = ({ children }) => {
  const [promise, setPromise] = useState(null)
  const initialDataRef = useRef({})
  const fieldsRef = useRef([])
  const titleRef = useRef('')
  const [visible, setVisible] = useState(false)

  const confirm = (title, fields, initialData) =>
    new Promise((resolve, reject) => {
      initialDataRef.current = initialData
      fieldsRef.current = fields
      titleRef.current = title
      setPromise({ resolve, reject })
      setVisible(true)
    })

  const handleConfirm = (data) => {
    promise?.resolve(data)
    setVisible(false)
  }

  const handleCancel = () => {
    promise?.reject()
    setVisible(false)
  }

  return (
    <MetadataDialogContext.Provider value={{ confirm }}>
      {children}
      {visible && (
        <MetadataDialog
          title={titleRef.current}
          fields={fieldsRef.current}
          initialData={initialDataRef.current}
          handleCancel={handleCancel}
          handleConfirm={handleConfirm}
        />
      )}
    </MetadataDialogContext.Provider>
  )
}

export const useMetadataDialog = () => {
  const context = useContext(MetadataDialogContext)
  if (!context) {
    throw new Error(
      'useMetadataDialog must be used within a MetadataDialogProvider'
    )
  }
  return context.confirm
}
