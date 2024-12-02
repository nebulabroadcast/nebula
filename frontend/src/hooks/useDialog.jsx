import { createContext, useState, useRef, useContext, useMemo } from 'react'

import MetadataDialog from '/src/containers/Dialogs/MetadataDialog'
import ConfirmDialog from '/src/containers/Dialogs/ConfirmDialog'
import SendToDialog from '/src/containers/Dialogs/SendToDialog'

const DialogContext = createContext()

export const DialogProvider = ({ children }) => {
  const promiseRef = useRef(null)
  const dialogProps = useRef({})
  const [dialogType, setDialogType] = useState(null)
  const [visible, setVisible] = useState(false)

  const handleConfirm = (data) => {
    console.log('Dialog confirmed with data', data)
    promiseRef.current?.resolve(data)
    cleanup()
  }

  const handleCancel = () => {
    console.log('Dialog cancelled')
    promiseRef.current?.reject(new Error('Dialog cancelled'))
    cleanup()
  }

  const cleanup = () => {
    setVisible(false)
    setDialogType(null)
    promiseRef.current = null
  }

  const execute = (dialogType, title, props) =>
    new Promise((resolve, reject) => {
      dialogProps.current = {
        title,
        handleConfirm,
        handleCancel,
        ...props,
      }

      promiseRef.current = { resolve, reject }
      setDialogType(dialogType)
      setVisible(true)
    })

  const DialogComponent = useMemo(() => {
    switch (dialogType) {
      case 'confirm':
        return ConfirmDialog
      case 'metadata':
        return MetadataDialog
      case 'sendto':
        return SendToDialog
      default:
        return null
    }
  }, [dialogType])

  return (
    <DialogContext.Provider value={{ execute }}>
      {children}
      {visible && DialogComponent && (
        <DialogComponent {...dialogProps.current} />
      )}
    </DialogContext.Provider>
  )
}

export const useDialog = () => {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider')
  }
  return context.execute
}
