import clsx from 'clsx';
import { useState, useEffect } from 'react';
import React from 'react';
import './Progress.css';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
}

export const Progress: React.FC<ProgressProps> = ({ value, className, ...props }) => {
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

  const istyle = {
    width: `${value}%`,
    transition: disableTransition ? 'none' : 'width 0.3s linear',
  };

  return (
    <div className={clsx('nb-progress', className)} {...props}>
      <div className={clsx('nb-progress-bar')} style={istyle} />
    </div>
  );
};
