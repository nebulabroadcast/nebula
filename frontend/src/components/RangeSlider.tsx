import clsx from 'clsx';
import React, { forwardRef } from 'react';
import './RangeSlider.css';

type RangeSliderProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const RangeSlider = forwardRef<HTMLInputElement, RangeSliderProps>(
  (props, ref) => {
    const { className, ...rest } = props;
    return (
      <input
        className={clsx('nb-range-slider', className)}
        ref={ref}
        type="range"
        {...rest}
      />
    );
  }
);

RangeSlider.displayName = 'RangeSlider';
