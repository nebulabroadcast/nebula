import ReactMarkdown from 'react-markdown'
import { Dialog } from '/src/components'

const ContextActionResult = ({mime, payload, onHide}) => {

  if (mime === 'text/markdown') {
  return (
    <Dialog onHide={onHide}>
      <ReactMarkdown>{payload}</ReactMarkdown>
    </Dialog>
  )
  }
}


export default ContextActionResult
