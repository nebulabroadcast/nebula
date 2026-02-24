import styled from 'styled-components';

import { getTheme } from './theme';

const NavbarTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 500;
  color: #f0f0f0;
  margin-right: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;

  .icon {
    font-size: 2.1rem;
  }
`;

const Spacer = styled.div`
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Section = styled.section`
  display: flex;
  padding: 12px;
  border-radius: 5px;
  background-color: var(--color-surface-02);
  border: 1px solid transparent;
`;

const ToolbarSeparator = styled.div`
  border-left: 1px solid ${getTheme().colors.surface04};
  height: 100%;
  margin: 0 4px;
`;

const PanelHeader = styled.h2`
  padding: 0;
  padding-bottom: 10px;
  margin: 0;
  margin-bottom: 10px;
  border-bottom: 1px solid #514a5e;
  font-size: 18px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
`;

export { NavbarTitle, Spacer, ToolbarSeparator, PanelHeader, Section };
