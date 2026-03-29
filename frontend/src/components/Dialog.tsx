import clsx from 'clsx';
import { useEffect, useRef } from 'react';

import { StyledDialog, DialogBody } from './Dialog.styled';

interface DialogProps {
  onHide: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  headerStyle?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  footerStyle?: React.CSSProperties;
}

const Dialog = ({
  onHide,
  header,
  footer,
  children,
  style,
  className,
  headerStyle,
  bodyStyle,
  footerStyle,
}: DialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;
    dialogElement.showModal();
    // Focus management is handled by the <dialog> element itself

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onHide();
    };

    // Add event listener for the cancel event (when user attempts to close the dialog)
    dialogElement.addEventListener('cancel', handleCancel);

    return () => {
      if (dialogElement) dialogElement.removeEventListener('cancel', handleCancel);
    };
  }, [onHide]);

  const onShadeClick = (event: React.MouseEvent) => {
    // No need for this with native dialog, but keeping for custom hide logic
    if (event.currentTarget != event.target) return;
    if (!onHide) return;
    event.preventDefault();
    onHide();
  };

  return (
    <StyledDialog
      className={clsx(className, 'enter-active')}
      style={style}
      ref={dialogRef}
      onClick={onShadeClick}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onHide();
      }}
    >
      {header && <header style={headerStyle}>{header}</header>}
      <DialogBody style={bodyStyle}>{children}</DialogBody>
      {footer && <footer style={footerStyle}>{footer}</footer>}
    </StyledDialog>
  );
};

export default Dialog;
