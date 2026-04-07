import clsx from 'clsx';
import React from 'react';

import './Layout.css';

export const Navbar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const classes = clsx('nb-navbar', className);
  return (
    <nav ref={ref} className={classes} {...props}>
      {props.children}
    </nav>
  );
});

export const NavbarTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const classes = clsx('nb-navbar-title', className);
  return (
    <nav ref={ref} className={classes} {...props}>
      {props.children}
    </nav>
  );
});

export const Spacer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const classes = clsx('nb-spacer', className);
  return (
    <nav ref={ref} className={classes} {...props}>
      {props.children}
    </nav>
  );
});

export const Section = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const classes = clsx('nb-section', className);
  return (
    <section ref={ref} className={classes} {...props}>
      {props.children}
    </section>
  );
});

export const ToolbarSeparator = () => {
  return <div className="nb-toolbar-separator" />;
};

export const PanelHeader = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const classes = clsx('nb-panel-header', className);
  return (
    <h2 ref={ref} className={classes} {...props}>
      {props.children}
    </h2>
  );
});
