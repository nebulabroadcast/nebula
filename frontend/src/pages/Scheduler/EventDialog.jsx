import React, { useMemo } from 'react'
import { Dialog } from '/src/components'
import MetadataEditor from '/src/containers/MetadataEditor'
import nebula from '/src/nebula'

const EventDialog = ({ data, setData, onHide }) => {
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

  console.log(data)
  console.log(fields)

  return (
    <Dialog header={header} onHide={onHide} style={{ minWidth: 600 }}>
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
