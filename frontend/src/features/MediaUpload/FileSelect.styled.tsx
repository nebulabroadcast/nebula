import styled from 'styled-components';

export const FileSelectWrapper = styled.div`
  border: 2px dashed var(--color-text-dim);
  height: 120px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  text-align: center;

  button {
    background: none;
    border: none;
    color: var(--color-text-dim);
    cursor: pointer;
    text-decoration: underline;
  }
`;
