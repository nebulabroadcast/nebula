import styled from 'styled-components'

const ScrollContainer = styled.div`
  flex-grow: 1;
  position: relative;
`

const ScrollContent = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
  overflow-x: auto;
  gap: 6px;
`

const ScrollBox = ({ children }) => {
  return (
    <ScrollContainer>
      <ScrollContent>{children}</ScrollContent>
    </ScrollContainer>
  )
}

export default ScrollBox
