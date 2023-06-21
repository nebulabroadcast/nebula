import ReactMarkdown from 'react-markdown'
import { Dialog, Button } from '/src/components'
import styled from 'styled-components'
import { toast } from 'react-toastify'

const MarkdownWrapper = styled.div`
  padding: 12px;

`


const UriWrapper = styled.div`
  display: inline-flex;
  gap: 2px;
  padding: 0;

  a {
    text-decoration: none;
    text-transform: none;
    color: #885bff;
    user-select: all;

    &:hover {
      text-decoration: underline;
      color: #a47bff;
    }
  }

  button {
    border: none;
    background: none;
    padding: 0;
    margin: 0;
    color: #885bff;
    cursor: pointer;
    width: 10px;
    height: 10px;
  }

`

const UriComponent = ({children, ...props}) => {
  return (
    <UriWrapper>
      <a {...props} >{children}</a>
      <button
        onClick={() => {
          navigator.clipboard.writeText(props.href)
          toast.success('Copied to clipboard')
        }}
      >
          <span className="icon material-symbols-outlined">
            content_copy
          </span>
      </button>
    </UriWrapper>
  )
}


const ContextActionResult = ({ mime, payload, onHide }) => {
  if (mime === 'text/markdown') {
    const components = {
      a: UriComponent
    }
    return (
      <Dialog onHide={onHide}>
        <MarkdownWrapper>
          <ReactMarkdown components={components}>
              {payload}
          </ReactMarkdown>
        </MarkdownWrapper>
      </Dialog>
    )
  }
}

export default ContextActionResult
