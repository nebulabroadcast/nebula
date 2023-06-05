import { useParams } from 'react-router-dom'
import styled from 'styled-components'

const Iframe = styled.iframe`
  flex-grow: 1;
  backgound: transparent;
  padding: 0;
  border: none;
`

const ToolPage = () => {
  const { tool } = useParams()
  const toolURL = `${window.location.origin}/plugins/${tool}/index.html`
  return <Iframe src={toolURL} />
}

export default ToolPage
