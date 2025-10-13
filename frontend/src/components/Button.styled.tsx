import styled from 'styled-components';

import { getTheme } from './theme';

export const BaseButton = styled.button`
  border: 0;
  border-radius: ${getTheme().inputBorderRadius};
  background: ${getTheme().inputBackground};
  color: ${getTheme().colors.text};
  font-size: ${getTheme().fontSize};
  padding-left: 12px;
  padding-right: 12px;
  min-height: ${getTheme().inputHeight};
  max-height: ${getTheme().inputHeight};
  min-width: ${getTheme().inputHeight} !important;

  &.icon-only {
    padding: 0;
    min-width: ${getTheme().inputHeight};
    max-width: ${getTheme().inputHeight};
    min-height: ${getTheme().inputHeight};
    max-height: ${getTheme().inputHeight};
    display: flex;
    align-items: center;
    justify-content: center;
  }

  user-select: none;
  user-drag: none;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  white-space: nowrap;

  .icon {
    font-size: 20px;
    padding-top: 2px;
  }

  &:focus {
    background: ${getTheme().colors.surface06};
    outline: 0;
  }

  &:hover {
    background: ${getTheme().colors.surface06};
    color: ${getTheme().colors.text};
    text-decoration: none; // when rendered as a
  }

  &:invalid,
  &.error {
    outline: 1px solid ${getTheme().colors.red} !important;
  }

  &.active {
    background: ${getTheme().colors.surface06};
    text-shadow: 0 0 4px ${getTheme().colors.highlight};
  }

  &:disabled {
    cursor: not-allowed;
    background: ${getTheme().colors.surface03};
    color: ${getTheme().colors.surface08};
    transition:
      background 0.2s,
      color 0.2s;
  }
`;

