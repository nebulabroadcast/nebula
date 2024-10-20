import React, { useMemo } from 'react'
import { Button, Dialog } from '/src/components'
import MetadataEditor from '/src/containers/MetadataEditor'
import nebula from '/src/nebula'

const EventDialog = ({ data, setData, onHide, onSave }) => {
  const header = useMemo(() => {
    if (data.title) return data.title
    if (!data.id) return 'New Event'
    return '???'
  }, [data])

  const originalData = useMemo(() => {
    return data
  }, [])

  const fields = useMemo(() => {
    return nebula.settings.playout_channels[0].fields
  }, [])

  const footer = (
    <>
      <Button onClick={() => onHide()} label="Cancel" icon="close" />
      <Button onClick={() => onSave(data)} label="Save" icon="check" />
    </>
  )

  return (
    <Dialog
      header={header}
      footer={footer}
      onHide={onHide}
      style={{ minWidth: 600, minHeight: 500 }}
    >
      <MetadataEditor
        objectData={data}
        originalData={originalData}
        setObjectData={setData}
        fields={fields}
      />
    </Dialog>
  )
}
export default EventDialog
