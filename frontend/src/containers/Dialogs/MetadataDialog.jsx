import { useState } from 'react'
import { Button, Dialog } from '/src/components'

import MetadataEditor from '/src/containers/MetadataEditor'

const MetadataDialog = (props) => {
  const [data, setData] = useState(props.initialData)

  const onReset = () => setData(props.initialData)
  const onCancel = () => props.handleCancel()
  const onConfirm = () => props.handleConfirm(data)

  const footer = (
    <>
      <Button onClick={onReset} label="Reset" icon="backspace" />
      <Button onClick={onCancel} label="Cancel" icon="close" />
      <Button onClick={onConfirm} label="Save" icon="check" />
    </>
  )

  return (
    <Dialog onHide={onCancel} header={props.title} footer={footer}>
      <MetadataEditor
        originalData={props.initialData}
        objectData={data}
        setObjectData={setData}
        fields={props.fields}
        onSave={onConfirm}
      />
    </Dialog>
  )
}

export default MetadataDialog
