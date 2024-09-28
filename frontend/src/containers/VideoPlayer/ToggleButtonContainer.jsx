import styled from 'styled-components'

const ToggleButtonContainer = styled.div`
  flex-direction: row;
  display: flex;
  gap: 8px;
  padding: 0;
  margin: 0;
  button {
    max-width: 30px !important;
    min-width: 30px !important;
    min-height: 30px !important;
    max-height: 30px !important;

    &.focus {
      outline: none !important;
    }

    &.active {
      color: var(--color-cyan) !important;
      outline: none;
    }

    &:not(.active) {
      color: var(--color-red);
      outline: none;
    }
  }
`

export default ToggleButtonContainer
