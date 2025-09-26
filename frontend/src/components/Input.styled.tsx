import styled from 'styled-components';

import { getTheme } from './theme';

const BaseInput = styled.input`
  border: 0;
  border-radius: ${getTheme().inputBorderRadius};
  background: ${getTheme().inputBackground};
  color: ${getTheme().colors.text};
  font-size: ${getTheme().fontSize};
  min-height: ${getTheme().inputHeight};
  max-height: ${getTheme().inputHeight};
  font-size: ${getTheme().fontSize};
  padding-left: ${getTheme().inputPadding};
  padding-right: ${getTheme().inputPadding};
  padding-top: 0;
  padding-bottom: 0;
  min-width: 200px;

  &:-webkit-autofill,
  &:-webkit-autofill:focus {
    transition:
      background-color 600000s 0s,
      color 600000s 0s;
  }

  &:focus {
    outline: 1px solid ${getTheme().colors.cyan};
  }

  &:hover {
    color: ${getTheme().colors.text};
  }

  &:invalid,
  &.error {
    outline: 1px solid ${getTheme().colors.red} !important;
  }

  &:read-only {
    font-style: italic;
  }

  &:disabled {
    cursor: not-allowed;
    background: ${getTheme().colors.surface03};
    color: ${getTheme().colors.surface08};
  }

  &.timecode {
    min-width: 92px;
    max-width: 92px;
    padding-right: 10px !important;
    text-align: right;
    font-family: monospace;
  }

  &.textarea {
    padding: ${getTheme().inputPadding};
    min-height: 60px;
    max-height: 400px !important;
    resize: vertical;
  }
`;

export default BaseInput;
