import styled from 'styled-components';

const MonitorWrapper = styled.div`
  background-color: var(--color-surface-01);
  box-shadow: 4px 4px 10px 4px rgba(0, 0, 0, 0.7);
  z-index: 1;

  position: fixed;
  bottom: 20px;
  right: 20px;

  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const MonitorItemWrapper = styled.div`
  padding: 10px;
  margin-bottom: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  display: flex;
  flex-direction: column;
  gap: 5px;

  .status {
    font-weight: bold;
    text-transform: uppercase;
  }

  .info {
    white-space: nowrap;
    font-size: 0.9em;
  }

  .actions {
    margin-top: 10px;
    text-align: right;
  }
`;

export { MonitorWrapper, MonitorItemWrapper };
