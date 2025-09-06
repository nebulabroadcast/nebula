import styled from 'styled-components';

import { getTheme } from './theme';

const Navbar = styled.nav`
  display: flex;
  flex-direction: row;
  gap: var(--gap-size);
  border-radius: ${getTheme().navBorderRadius};
  background-color: ${getTheme().colors.surface02};
  padding: 4px 10px;
  align-items: center;

  a {
    margin-right: 15px;
    text-transform: uppercase;
    text-decoration: none;
    transition: text-shadow 0.2s;
    color: #b0b0b0;
    user-select: none !important;

    &:hover {
      color: white
      text-shadow: 0 0 5px #aaa
      transition: text-shadow 0.2s
    }

    &.active {
      color: white
    }
  }


  .left {
    flex: 1;
    display: flex;
    justify-content: flex-start;
    align-items: center;
  }

  .center {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .right {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    align-items: center;
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

export { Navbar, Spacer, ToolbarSeparator, PanelHeader, Section };
