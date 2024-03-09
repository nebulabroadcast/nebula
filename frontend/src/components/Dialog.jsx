import { useEffect, useRef } from 'react'
import styled from 'styled-components'

const StyledDialog = styled.dialog`
  color: var(--color-text);
  padding: 6px;
  background-color: var(--color-surface-02);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 300px;
  min-height: 150px;
  max-width: 85%;
  max-height: 80%;
  border: none;

  transition: all 0.3s ease;

  &::backdrop {
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(2px);
  }

  header,
  footer {
    padding: 12px 6px;
    display: flex;
    flex-direction: row;
    gap: 6px;
  }

  header {
    font-weight: bold;
    border-bottom: 1px solid var(--color-surface-04);
    justify-content: flex-start;
  }

  footer {
    border-top: 1px solid var(--color-surface-04);
    justify-content: flex-end;
    button {
      min-width: 100px !important;
    }
  }
`

const DialogBody = styled.div`
  padding: 12px 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-grow: 1;
  overflow: auto;
  position: relative;
`

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
}) => {
  const dialogRef = useRef(null)

  useEffect(() => {
    // Automatically open the dialog when the component mounts
    dialogRef.current.showModal()
    // Focus management is handled by the <dialog> element itself

    const handleCancel = (event) => {
      event.preventDefault()
      onHide()
    }

    // Add event listener for the cancel event (when user attempts to close the dialog)
    dialogRef.current.addEventListener('cancel', handleCancel)

    return () => {
      if (dialogRef.current)
        dialogRef.current.removeEventListener('cancel', handleCancel)
    }
  }, [onHide])

  const onShadeClick = (event) => {
    // No need for this with native dialog, but keeping for custom hide logic
    if (event.currentTarget != event.target) return
    if (!onHide) return
    event.preventDefault()
    onHide()
  }

  return (
    <StyledDialog
      className={className}
      style={style}
      ref={dialogRef}
      onClick={onShadeClick}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onHide()
      }}
    >
      {header && <header style={headerStyle}>{header}</header>}
      <DialogBody style={bodyStyle}>{children}</DialogBody>
      {footer && <footer style={footerStyle}>{footer}</footer>}
    </StyledDialog>
  )
}

export default Dialog
