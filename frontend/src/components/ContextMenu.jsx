import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import styled from 'styled-components'
import Button from './Button'

const ContextMenuWrapper = styled.div`
  position: fixed;
  display: inline-block;

  background-color: var(--color-surface-04);
  min-width: 100px;
  box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
  z-index: 1;

  hr {
    margin: 0;
    border: none;
    border-top: 2px solid var(--color-surface-03);
  }

  button {
    background: none;
    border: none;
    width: 100%;
    justify-content: flex-start;
    border-radius: 0;
    padding: 20px 10px;

    &:hover {
      background-color: var(--color-surface-03);
    }

    &:active,
    &:focus {
      outline: none !important;
    }

    &:disabled {
      color: var(--color-text-dim);
    }
  }
`

const ContextMenu = ({ target, options }) => {
  const [contextData, setContextData] = useState({
    visible: false,
    posX: 0,
    posY: 0,
  })
  const contextRef = useRef(null)

  useEffect(() => {
    const contextMenuEventHandler = (event) => {
      const targetElement = target.current
      if (targetElement && targetElement.contains(event.target)) {
        event.preventDefault()
        setTimeout(() => {
          setContextData({
            visible: true,
            posX: event.clientX,
            posY: event.clientY,
          })
        }, 0)
      } else if (
        contextRef.current &&
        !contextRef.current.contains(event.target)
      ) {
        setContextData({ ...contextData, visible: false })
      }
    }

    const offClickHandler = (event) => {
      if (contextRef.current && !contextRef.current.contains(event.target)) {
        setContextData({ ...contextData, visible: false })
      }
    }

    document.addEventListener('contextmenu', contextMenuEventHandler)
    document.addEventListener('click', offClickHandler)
    return () => {
      document.removeEventListener('contextmenu', contextMenuEventHandler)
      document.removeEventListener('click', offClickHandler)
    }
  }, [contextData, target])

  useLayoutEffect(() => {
    if (
      contextData.posX + contextRef.current?.offsetWidth >
      window.innerWidth
    ) {
      setContextData({
        ...contextData,
        posX: contextData.posX - contextRef.current?.offsetWidth,
      })
    }
    if (
      contextData.posY + contextRef.current?.offsetHeight >
      window.innerHeight
    ) {
      setContextData({
        ...contextData,
        posY: contextData.posY - contextRef.current?.offsetHeight,
      })
    }
  }, [contextData])

  return (
    <ContextMenuWrapper
      ref={contextRef}
      style={{
        display: `${contextData.visible ? 'block' : 'none'}`,
        left: contextData.posX,
        top: contextData.posY,
      }}
    >
      {options().map((option, idx) => (
        <span key={idx}>
          {option.separator && <hr />}
          <Button
            label={option.label}
            icon={option.icon}
            onClick={() => {
              setContextData({ ...contextData, visible: false })
              option.onClick && option.onClick()
            }}
          />
        </span>
      ))}
    </ContextMenuWrapper>
  )
}

export default ContextMenu
