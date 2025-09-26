import styled from 'styled-components';

export const StyledDialog = styled.dialog`
  color: var(--color-text);
  padding: 6px;
  background-color: var(--color-surface-02);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 300px;
  min-height: 150px;
  max-width: 85%;
  max-height: 80%;
  border: none;

  // Animated parameters

  transition: all 0.3s ease;
  opacity: 0;
  transform: scale(0.9);

  &::backdrop {
    background-color: rgba(0, 0, 0, 0);
    backdrop-filter: none;
    z-index: 999; // P5e04
  }

  &[open] {
    opacity: 1;
    transform: scale(1);
    &::backdrop {
      background-color: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px);
    }
  }

  // Guts

  header,
  footer {
    padding: 12px 6px;
    display: flex;
    flex-direction: row;
    gap: 6px;
  }

  header {
    font-weight: bold;
    border-bottom: 1px solid var(--color-surface-04);
    justify-content: flex-start;
  }

  footer {
    border-top: 1px solid var(--color-surface-04);
    justify-content: flex-end;
    button {
      min-width: 100px !important;
    }
  }
`;

export const DialogBody = styled.div`
  padding: 12px 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-grow: 1;
  overflow: auto;
  position: relative;
`;


