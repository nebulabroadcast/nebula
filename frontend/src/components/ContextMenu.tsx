import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import styled from 'styled-components';
import Button from './Button';

const ContextMenuWrapper = styled.div`
  position: fixed;
  display: inline-block;

  background-color: var(--color-surface-02);
  min-width: 100px;
  box-shadow: 4px 4px 10px 4px rgba(0, 0, 0, 0.7);
  z-index: 1;

  hr {
    margin: 0;
    border: none;
    border-top: 2px solid var(--color-surface-05);
  }

  button {
    background: none;
    border: none;
    width: 100%;
    justify-content: flex-start;
    border-radius: 0;
    padding: 20px 10px;

    &:hover {
      background-color: var(--color-surface-04);
    }

    &:active,
    &:focus {
      outline: none !important;
    }

    &:disabled {
      color: var(--color-text-dim);
    }
  }
`;

interface ContextMenuOption {
  label: string;
  icon?: string;
  hlColor?: string;
  separator?: boolean;
  onClick?: (contextData: { posX: number; posY: number }) => void;
}

interface ContextMenuProps {
  target: React.RefObject<HTMLElement>;
  options: () => ContextMenuOption[];
}

const ContextMenu: React.FC<ContextMenuProps> = ({ target, options }) => {
  const [contextData, setContextData] = useState({
    visible: false,
    posX: 0,
    posY: 0,
  });
  const contextRef = useRef(null);

  useEffect(() => {
    const contextMenuEventHandler = (event: MouseEvent) => {
      const targetElement = target.current;
      if (targetElement && targetElement.contains(event.target as Node)) {
        event.preventDefault();
        setTimeout(() => {
          setContextData({
            visible: true,
            posX: event.clientX,
            posY: event.clientY,
          });
        }, 0);
      } else if (
        contextRef.current &&
        (contextRef.current as HTMLElement).contains(event.target as Node)
      ) {
        setContextData({ ...contextData, visible: false });
      }
    };

    const offClickHandler = (event: MouseEvent) => {
      if (
        contextRef.current &&
        !(contextRef.current as HTMLElement).contains(event.target as Node)
      ) {
        setContextData({ ...contextData, visible: false });
      }
    };

    document.addEventListener('contextmenu', contextMenuEventHandler);
    document.addEventListener('click', offClickHandler);
    return () => {
      document.removeEventListener('contextmenu', contextMenuEventHandler);
      document.removeEventListener('click', offClickHandler);
    };
  }, [contextData, target]);

  useLayoutEffect(() => {
    if (!contextRef?.current) return;
    const element = contextRef.current as HTMLElement;

    if (contextData.posX + element.offsetWidth > window.innerWidth) {
      setContextData({
        ...contextData,
        posX: contextData.posX - element.offsetWidth,
      });
    }
    if (contextData.posY + element.offsetHeight > window.innerHeight) {
      setContextData({
        ...contextData,
        posY: contextData.posY - element.offsetHeight,
      });
    }
  }, [contextData]);

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
            iconStyle={option.hlColor ? { color: option.hlColor } : {}}
            onClick={() => {
              setContextData({ ...contextData, visible: false });
              if (option.onClick) option.onClick(contextData);
            }}
          />
        </span>
      ))}
    </ContextMenuWrapper>
  );
};

export default ContextMenu;
