import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

import { Button, Dialog } from '/src/components'

const ConfirmDialog = (props) => {
  const onCancel = () => props.handleCancel()
  const onConfirm = () => props.handleConfirm()

  const footer = (
    <>
      <Button
        onClick={onCancel}
        label={props.cancelLabel || 'Cancel'}
        icon="close"
        hlColor="var(--color-red)"
      />
      <Button
        onClick={onConfirm}
        label={props.confirmLabel || 'Confirm'}
        icon="check"
        hlColor="var(--color-green)"
      />
    </>
  )

  return (
    <Dialog onHide={onCancel} header={props.title} footer={footer}>
      <ReactMarkdown>{props.message}</ReactMarkdown>
    </Dialog>
  )
}

export default ConfirmDialog
