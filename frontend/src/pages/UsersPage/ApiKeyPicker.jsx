import { toast } from 'react-toastify'
import { v4 as uuidv4 } from 'uuid'
import { useState, useMemo } from 'react'

import { Dialog, InputText, Button } from '/src/components'

const ApiKeyPicker = ({ setApiKey }) => {
  const [dialogVisible, setDialogVisible] = useState(false)

  const dialog = useMemo(() => {
    if (!dialogVisible) return null

    const newKey = uuidv4()
    return (
      <Dialog
        onHide={() => setDialogVisible(false)}
        header="Create API key"
        footer={
          <>
            <Button
              icon="close"
              label="Cancel"
              onClick={() => setDialogVisible(false)}
            />
            <Button
              icon="check"
              label="Store"
              onClick={() => {
                setApiKey(newKey)
                setDialogVisible(false)
              }}
            />
          </>
        }
      >
        <p>
          This API key will be used to authenticate your requests to the server.
        </p>
        <p>
          Copy it to your clipboard and store it in a safe place. You will not
          be able to retrieve it later.
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <InputText value={newKey} readOnly style={{ flexGrow: 1 }} />
          <Button
            icon="content_copy"
            label="Copy to clipboard"
            onClick={() => {
              navigator.clipboard.writeText(newKey)
              toast.success('Copied to clipboard')
            }}
          />
        </div>
      </Dialog>
    )
  }, [dialogVisible])

  return (
    <>
      {dialog}
      <Button
        icon="key"
        label="Create API key"
        onClick={() => setDialogVisible(true)}
      />
    </>
  )
}

export default ApiKeyPicker
