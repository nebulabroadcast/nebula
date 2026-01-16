import styled from 'styled-components';

export const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;

  .dropdown-content {
    display: none;
    position: absolute;
    background-color: var(--color-surface-02);
    min-width: 100px;
    box-shadow: 4px 4px 10px 4px rgba(0, 0, 0, 0.7);
    z-index: 5;

    hr {
      margin: 0;
      border: none;
      border-top: 2px solid var(--color-surface-03);
    }

    button {
      background: none;
      width: 100%;
      justify-content: flex-start;
      border-radius: 0;
      padding: 25px 8px;

      &:hover {
        background-color: var(--color-surface-04);
      }

      &.active,
      &:focus {
        outline: none !important;
        background-color: var(--color-surface-04);
        text-shadow: none !important;
      }

      &:disabled {
        color: var(--color-text-dim);
      }
    }
  }

  > button {
    // background: none;
    // border: none;
    // border-radius: 0;
    padding: 0 8px;
    justify-content: space-between;

    &:active,
    &:focus {
      outline: none !important;
    }
  }

  &:not(.disabled):hover .dropdown-content {
    display: block;
  }
`;
