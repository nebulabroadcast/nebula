import nebula from '/src/nebula'
import { useState, useEffect, useMemo } from 'react'
import { toast } from 'react-toastify'
import { Dialog, Button } from '/src/components'


const SendToDialog = ({assets, onHide}) => {
  const [sendToOptions, setSendToOptions] = useState([])

  const loadOptions = () => {
    nebula
      .request('actions', {ids: assets})
      .then((response) => {
        setSendToOptions(response.data.actions)
      })
  } 

  useEffect(() => {
    loadOptions()
  }, [assets])


  const onSend = (action) => {
    nebula
      .request('send', {ids: assets, id_action: action})
      .then(() => {
        toast.success("Job request accepted")
        onHide()
      })
      .catch((error) => {
        toast.error(error.response.detail)
      })
  }


  const body = useMemo(() => {
    if (sendToOptions.length === 0) return null
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
    if (sendToOptions.length === 0) return null
    return <Button label="Cancel" onClick={onHide} />
  }, [sendToOptions])


  return (
    <Dialog 
      onHide={onHide} 
      style={{  width: 600 }} 
      header="Send to..." 
      footer={footer}
    >
      {body}
    </Dialog>
  )
}

export default SendToDialog
