import styled from 'styled-components'

const LoaderContainer = styled.div`
  display: inline-block;
  position: relative;
  z-index: 1000;

  width: 50px;
  aspect-ratio: 1;
  --c: no-repeat radial-gradient(farthest-side, #514b82 92%, #0000);
  background: var(--c) 50% 0, var(--c) 50% 100%, var(--c) 100% 50%,
    var(--c) 0 50%;
  background-size: 10px 10px;
  animation: l18 0.5s infinite;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    margin: 3px;
    background: repeating-conic-gradient(#0000 0 35deg, #514b82 0 90deg);
    -webkit-mask: radial-gradient(
      farthest-side,
      #0000 calc(100% - 3px),
      #000 0
    );
    border-radius: 50%;
  }
  @keyframes l18 {
    100% {
      transform: rotate(0.5turn);
    }
  }
`

const LoaderWrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.01);
  display: flex;
  align-items: center;
  justify-content: center;
`

const Loader = ({ style }) => {
  return <LoaderContainer style={style}></LoaderContainer>
}

export { Loader, LoaderWrapper }
