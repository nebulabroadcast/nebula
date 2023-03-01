import styled from 'styled-components'
import defaultTheme from './theme'

const Navbar = styled.nav`
  display: flex;
  flex-direction: row;
  gap: var(--gap-size);
  border-radius: ${(props) => props.theme.navBorderRadius};
  background-color: ${(props) => props.theme.colors.surface02};
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
`
Navbar.defaultProps = {
  theme: defaultTheme,
}

const Spacer = styled.div`
  flex-grow: 1;
`

const ToolbarSeparator = styled.div`
  border-left: 1px solid ${(props) => props.theme.colors.surface04};
  height: 100%;
  margin: 0 4px;
`
ToolbarSeparator.defaultProps = {
  theme: defaultTheme,
}

const DialogButtons = styled.div`
  display: flex;
  flex-direction: row;
  gap: 4px;
  justify-content: flex-end;
  margin-top: 10px;
`

export { Navbar, Spacer, ToolbarSeparator, DialogButtons }
