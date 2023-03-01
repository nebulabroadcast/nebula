import { useMemo, useEffect, useRef } from 'react'
import styled from 'styled-components'

const Shade = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10%;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 500;
`

const DialogWindow = styled.div`
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
  position: relative;

  :focus {
    outline: none;
  }
`

const BaseDialogEdge = styled.div`
  padding: 12px 6px;
  display: flex;
  flex-direction: row;
  gap: 6px;
`

const DialogHeader = styled(BaseDialogEdge)`
  font-weight: bold;
  border-bottom: 1px solid var(--color-surface-04);
`

const DialogFooter = styled(BaseDialogEdge)`
  border-top: 1px solid var(--color-surface-04);
  justify-content: flex-end;
`

const DialogBody = styled.div`
  padding: 12px 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-grow: 1;
  overflow: auto;
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
    dialogRef.current.focus()
  }, [dialogRef.current])

  const headerComp = useMemo(() => {
    if (!header) return null
    return <DialogHeader style={headerStyle}>{header}</DialogHeader>
  }, [header])

  const footerComp = useMemo(() => {
    if (!footer) return null
    return <DialogFooter style={footerStyle}>{footer}</DialogFooter>
  }, [footer])

  const onShadeClick = (event) => {
    if (event.currentTarget != event.target) return
    if (!onHide) return
    event.preventDefault()
    onHide()
  }

  const onKeyDown = (event) => {
    if (event.key === 'Escape') onHide()
  }

  return (
    <Shade
      className="dialog-shade"
      onClick={onShadeClick}
      onKeyDown={onKeyDown}
    >
      <DialogWindow
        className={className}
        style={style}
        onKeyDown={onKeyDown}
        ref={dialogRef}
        tabIndex={0}
      >
        {headerComp}
        <DialogBody style={bodyStyle}>{children}</DialogBody>
        {footerComp}
      </DialogWindow>
    </Shade>
  )
}

export default Dialog
