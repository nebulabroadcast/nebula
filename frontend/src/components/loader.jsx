import styled from 'styled-components'

const LoaderContainer = styled.div`
  display: inline-block;
  position: relative;
  width: 80px;
  height: 80px;
  z-index: 1000;

  div {
    position: absolute;
    top: 33px;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: #fff;
    animation-timing-function: cubic-bezier(0, 1, 1, 0);

    &:nth-child(1) {
      left: 8px;
      animation: lds-ellipsis1 0.6s infinite;
    }

    &:nth-child(2) {
      left: 8px;
      animation: lds-ellipsis2 0.6s infinite;
    }

    &:nth-child(3) {
      left: 32px;
      animation: lds-ellipsis2 0.6s infinite;
    }

    &:nth-child(4) {
      left: 56px;
      animation: lds-ellipsis3 0.6s infinite;
    }

    @keyframes lds-ellipsis1 {
      0% {
        transform: scale(0);
      }
      100% {
        transform: scale(1);
      }
    }
`

const Loader = ({ style }) => {
  return (
    <LoaderContainer style={style}>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </LoaderContainer>
  )
}

export default Loader
