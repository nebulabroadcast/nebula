import nebula from '/src/nebula'
import { useState, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'react-toastify'
import { Dialog, Button, ErrorBanner } from '/src/components'

const SendToDialog = ({ onHide }) => {
  const [sendToOptions, setSendToOptions] = useState(null)
  const selectedAssets = useSelector((state) => state.context.selectedAssets)

  const loadOptions = () => {
    nebula.request('actions', { ids: selectedAssets }).then((response) => {
      setSendToOptions(response.data.actions)
    })
  }

  useEffect(() => {
    loadOptions()
  }, [selectedAssets])

  const onSend = (action) => {
    nebula
      .request('send', { ids: selectedAssets, id_action: action })
      .then(() => {
        toast.success('Job request accepted')
        onHide()
      })
      .catch((error) => {
        toast.error(error.response.detail)
      })
  }

  const body = useMemo(() => {
    if (!sendToOptions) return null
    if (sendToOptions.length === 0) {
      return (
        <ErrorBanner>
          No actions available for the current selection
        </ErrorBanner>
      )
    }
    return (
      <>
        {sendToOptions.map((option) => {
          return (
            <Button
              key={option.id}
              label={option.name}
              onClick={() => onSend(option.id)}
            />
          )
        })}
      </>
    )
  }, [sendToOptions])

  const footer = useMemo(() => {
    if (!sendToOptions?.length) return null
    return <Button label="Cancel" onClick={onHide} icon="close" />
  }, [sendToOptions])

  const what =
    selectedAssets.length === 1
      ? 'the asset'
      : `${selectedAssets.length} assets`

  return (
    <Dialog
      onHide={onHide}
      style={{ width: 600 }}
      header={`Send ${what} to...`}
      footer={footer}
    >
      {body}
    </Dialog>
  )
}

export { SendToDialog }
