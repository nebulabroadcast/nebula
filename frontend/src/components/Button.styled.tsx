import styled, { css } from 'styled-components';

import { getTheme } from './theme';

export const ButtonStyle = css`
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
    background: var(--hover-item-background);
    color: var(--hover-item-color);
    text-decoration: none; // when rendered as <a>
  }

  &:invalid,
  &.error {
    outline: 1px solid ${getTheme().colors.red} !important;
  }

  &.active {
    background: var(--active-item-background);
    color: var(--active-item-color);
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

export const BaseButton = styled.button`
  ${ButtonStyle}
`;
