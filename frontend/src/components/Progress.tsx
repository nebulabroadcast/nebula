import { useState, useEffect } from 'react';
import React from 'react';
import styled from 'styled-components';

import { getTheme } from './theme';

interface BaseProgressProps {
  disableTransition: boolean;
}

const BaseProgress = styled.div<BaseProgressProps>`
  width: 100%;
  border: 0;
  border-radius: ${getTheme().inputBorderRadius};
  background: ${getTheme().inputBackground};
  height: 10px;

  .progress {
    height: 100%;
    background: ${getTheme().colors.cyan};
    border-radius: ${getTheme().inputBorderRadius};
    transition: ${(props) => (props.disableTransition ? 'none' : 'width 0.3s linear')};
  }
`;

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
}

const Progress: React.FC<ProgressProps> = ({ value, ...props }) => {
  const [prevValue, setPrevValue] = useState(value);
  const [disableTransition, setDisableTransition] = useState(false);

  useEffect(() => {
    if (value < prevValue) {
      setDisableTransition(true);
    } else {
      setDisableTransition(false);
    }
    setPrevValue(value);
  }, [value, prevValue]);

  return (
    <BaseProgress {...props} disableTransition={disableTransition}>
      <div
        className="progress"
        style={{ width: `${value}%` }}
        key={disableTransition ? 'no-transition' : 'transition'}
      />
    </BaseProgress>
  );
};

export default Progress;
