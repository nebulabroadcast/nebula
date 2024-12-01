import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

import { Button, Dialog } from '/src/components'

const ConfirmDialog = (props) => {
  const onCancel = () => props.handleCancel()
  const onConfirm = () => props.handleConfirm()

  const footer = (
    <>
      <Button onClick={onCancel} label="Cancel" icon="close" />
      <Button onClick={onConfirm} label="Confirm" icon="check" />
    </>
  )

  return (
    <Dialog onHide={onCancel} header={props.title} footer={footer}>
      <ReactMarkdown>{props.message}</ReactMarkdown>
    </Dialog>
  )
}

export default ConfirmDialog
