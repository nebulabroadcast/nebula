import { useState } from 'react'
import styled from 'styled-components'

import { Button, Dialog } from '/src/components'

const Question = styled.div`
  padding: 20px;
`

const useConfirm = () => {
  const [promise, setPromise] = useState(null)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')

  const confirm = (title, message) =>
    // eslint-disable-next-line
    new Promise((resolve, reject) => {
      setTitle(title)
      setMessage(message)
      setPromise({ resolve })
    })

  const handleClose = () => {
    setPromise(null)
  }

  const handleConfirm = () => {
    promise?.resolve(true)
    handleClose()
  }

  const handleCancel = () => {
    promise?.resolve(false)
    handleClose()
  }

  const footer = (
    <>
      <Button onClick={handleConfirm} label="Yes" icon="check" />
      <Button onClick={handleCancel} label="No" icon="close" />
    </>
  )

  const ConfirmationDialog = () => {
    if (!promise) return
    return (
      <Dialog onHide={handleClose} header={title} footer={footer}>
        <Question>{message}</Question>
      </Dialog>
    )
  }

  return [ConfirmationDialog, confirm]
}

const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key)
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      // If error also return initialValue
      console.error(error)
      return initialValue
    }
  })

  const setValue = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value
      // Save state
      setStoredValue(valueToStore)
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.error(error)
    }
  }
  return [storedValue, setValue]
}

export { useLocalStorage, useConfirm }
