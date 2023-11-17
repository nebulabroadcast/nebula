import { toast } from 'react-toastify'
import { useState, useMemo } from 'react'
import styled from 'styled-components'

import { Dialog, InputText, Button } from '/src/components'


const SubRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
`


const createApiKey = () => {
    const prefix = 'nb';
    const segmentCount = 4;
    const segmentLength = 12;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';
    const segments = [];

    for (let i = 0; i < segmentCount; i++) {
        let segment = '';
        for (let j = 0; j < segmentLength; j++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            segment += characters[randomIndex];
        }
        segments.push(segment);
    }

    return `${prefix}.${segments.join('.')}`;
}


const ApiKeyPicker = ({ setApiKey, apiKeyPreview }) => {
  const [dialogVisible, setDialogVisible] = useState(false)

  const dialog = useMemo(() => {
    if (!dialogVisible) return null

    const newKey = createApiKey()
    return (
      <Dialog
        onHide={() => setDialogVisible(false)}
        style={{ width: 550 }}
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
          Copy it to your clipboard and store it in a safe place. You will not
          be able to retrieve it later.
        </p>

        <SubRow>
          <InputText 
            value={newKey} 
            readOnly 
            style={{ 
              flexGrow: 1,
              fontFamily: "monospace",
              fontStyle: "normal",
              textAlign: "center",
            }} 
            onClick={(e) => e.target.select()}
          />
          <Button
            icon="content_copy"
            tooltip="Copy to clipboard"
            onClick={() => {
              navigator.clipboard.writeText(newKey)
              toast.success('Copied to clipboard')
            }}
          />
        </SubRow>
      </Dialog>
    )
  }, [dialogVisible])

  return (
    <>
    <SubRow>
      <InputText 
        value={apiKeyPreview} 
        readOnly 
        style={{ 
          flexGrow: 1,
          fontFamily: "monospace",
          fontStyle: "normal",
          textAlign: "center",
        }} 
      />
      <Button
        icon="key"
        label="Create API key"
        onClick={() => setDialogVisible(true)}
      />
    </SubRow>
    {dialog}
    </>
  )
}

export default ApiKeyPicker
