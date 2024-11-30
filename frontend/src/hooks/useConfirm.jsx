import ReactMarkdown from 'react-markdown'
import styled from 'styled-components'
import { useState } from 'react'
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
        <Question>
          <ReactMarkdown>{message}</ReactMarkdown>
        </Question>
      </Dialog>
    )
  }

  return [ConfirmationDialog, confirm]
}

export default useConfirm
