import clsx from 'clsx';
import React from 'react';

import './Loader.css';

export const Loader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const classes = clsx('nb-loader', className);
  return (
    <div ref={ref} className={classes} {...props}>
      {props.children}
    </div>
  );
});

export const LoaderWrapper = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const classes = clsx('nb-loader-wrapper', className);
  return (
    <div ref={ref} className={classes} {...props}>
      {props.children}
    </div>
  );
});
