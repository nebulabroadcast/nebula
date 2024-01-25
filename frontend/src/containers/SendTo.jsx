import nebula from '/src/nebula'
import { useState, useEffect, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { toast } from 'react-toastify'
import { Dialog, Button, ErrorBanner } from '/src/components'
import { hideSendToDialog } from '/src/actions'

const SendToDialogBody = ({ selectedAssets, onHide }) => {
  const [sendToOptions, setSendToOptions] = useState(null)

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

const SendToDialog = () => {
  const dialogVisible = useSelector(
    (state) => state.context.sendToDialogVisible
  )
  const selectedAssets = useSelector((state) => state.context.selectedAssets)
  const forcedIds = useSelector((state) => state.context.sendToIds)
  const dispatch = useDispatch()

  const ids = forcedIds || selectedAssets

  const onHide = () => {
    dispatch(hideSendToDialog())
  }
  return (
    dialogVisible && <SendToDialogBody onHide={onHide} selectedAssets={ids} />
  )
}

export default SendToDialog
