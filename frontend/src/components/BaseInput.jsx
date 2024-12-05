import styled from 'styled-components'
import defaultTheme from './theme'

const BaseInput = styled.input`
  border: 0;
  border-radius: ${(props) => props.theme.inputBorderRadius};
  background: ${(props) => props.theme.inputBackground};
  color: ${(props) => props.theme.colors.text};
  font-size: ${(props) => props.theme.fontSize};
  min-height: ${(props) => props.theme.inputHeight};
  max-height: ${(props) => props.theme.inputHeight};
  font-size: ${(props) => props.theme.fontSize};
  padding-left: ${(props) => props.theme.inputPadding};
  padding-right: ${(props) => props.theme.inputPadding};
  padding-top: 0;
  padding-bottom: 0;
  min-width: 200px;

  &:-webkit-autofill,
  &:-webkit-autofill:focus {
    transition: background-color 600000s 0s, color 600000s 0s;
  }

  &:focus {
    outline: 1px solid ${(props) => props.theme.colors.cyan};
  }

  &:hover {
    color: ${(props) => props.theme.colors.text};
  }

  &:invalid,
  &.error {
    outline: 1px solid ${(props) => props.theme.colors.red} !important;
  }

  &:read-only {
    font-style: italic;
  }

  &:disabled {
    cursor: not-allowed;
    background: ${(props) => props.theme.colors.surface03};
    color: ${(props) => props.theme.colors.surface08};
  }

  &.timecode {
    min-width: 92px;
    max-width: 92px;
    padding-right: 10px !important;
    text-align: right;
    font-family: monospace;
  }

  &.textarea {
    padding: ${(props) => props.theme.inputPadding};
    min-height: 60px;
    max-height: 400px !important;
    resize: vertical;
  }
`
BaseInput.defaultProps = {
  theme: defaultTheme,
}

export default BaseInput
