import { TableDraggableItem } from '@components/table/types';
import Browser from '@containers/Browser';
import Splitter, { SplitDirection } from '@devbookhq/splitter';
import {
  DndContext,
  MouseSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { useNebula } from '@features/Nebula';
import { useLocalStorage } from '@lib/useLocalStorage';
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router';
import styled from 'styled-components';

import Rundown from './Rundown';

import AssetEditor from '@/pages/AssetEditor';
import Scheduler from '@/pages/Scheduler';

const MAMContainer = styled.div`
  flex-grow: 1;

  .__dbk__gutter.Dark {
    background-color: var(--color-surface-01);
  }

  .__dbk__child-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--section-gap);
    min-width: 400px;
  }

  .__dbk__child-wrapper:last-child {
    min-width: 1000px;
  }
`;

const DraggedIndicator = styled.div`
  display: flex;
  flex-direction: column;
  position: fixed;

  div {
    display: inline-block;
    padding: 4px;
    background-color: var(--color-surface-05);
    box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.3);
  }
`;

const MAMPage: React.FC = () => {
  // This is a wrapper components for all the MAM pages
  // It will render the correct page based on the URL
  // along with the browser component

  const { focusedAsset, setFocusedAsset, setSelectedAssets } = useNebula();
  const { module } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [splitterSizes, setSplitterSizes] = useLocalStorage<number[] | null>(
    'mam.splitterSizes',
    null
  );

  const draggedIndicatorRef = useRef<HTMLDivElement>(null);

  // Drag and drop from the browser
  const [draggedObjects, setDraggedObjects] = useState<TableDraggableItem[] | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);

  const mouseSensor = useSensor(MouseSensor, {
    // Require the mouse to move by 10 pixels before activating
    activationConstraint: {
      distance: 10,
    },
  });

  const sensors = useSensors(mouseSensor);

  const setBodyCursor = (cursor: string) => {
    document.body.style.setProperty('cursor', cursor, 'important');
  };

  const onDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    const objects = event.active.data.current as TableDraggableItem[];
    console.debug('Start drag', objects);
    setDraggedObjects(objects);
    setBodyCursor('grabbing');
  };

  const onDragEnd = (event: DragEndEvent) => {
    console.debug('End drag', event.active.data.current);
    setIsDragging(false);
    setDraggedObjects(null);
    setBodyCursor('auto');
  };

  //
  // URL handling
  //

  useEffect(() => {
    const assetParam = searchParams.get('asset');
    if (assetParam) {
      const assetId = parseInt(assetParam);
      if (isNaN(assetId)) return;
      if (assetId === focusedAsset) return;
      setFocusedAsset(assetId);
      setSelectedAssets([assetId]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('asset')]);

  useEffect(() => {
    const assetParam = searchParams.get('asset');
    if (focusedAsset?.toString() === assetParam) return;
    if (focusedAsset === null) {
      setSearchParams((o) => {
        o.delete('asset');
        return o;
      });
      return;
    }
    setSearchParams((o) => {
      o.set('asset', focusedAsset.toString());
      return o;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedAsset]);

  //
  // MAM Module
  //

  const moduleComponent = useMemo(() => {
    const componentProps = {
      draggedObjects,
    };

    if (module == 'editor') return <AssetEditor {...componentProps} />;
    if (module == 'scheduler') return <Scheduler {...componentProps} />;
    if (module == 'rundown') return <Rundown {...componentProps} />;

    return 'Not implemented';
  }, [module, draggedObjects]);

  const onResizeStart = () => {
    document.body.style.userSelect = 'none';
  };
  const onResizeEnd = (_gutter: number, size: number[]) => {
    setSplitterSizes(size);
    document.body.style.userSelect = '';
  };

  //
  // Render
  //

  const draggedwidget = useMemo(() => {
    if (!draggedObjects?.length) return null;
    return (
      <>
        {(draggedObjects || []).map((obj, idx) => {
          return <div key={idx}>{obj.title}</div>;
        })}
      </>
    );
  }, [draggedObjects]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggedIndicatorRef.current) return;
      draggedIndicatorRef.current.style.left = e.clientX + 20 + 'px';
      draggedIndicatorRef.current.style.top = e.clientY + 20 + 'px';
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <MAMContainer>
      <DndContext
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
        onDragCancel={onDragEnd}
        sensors={sensors}
      >
        <Splitter
          direction={SplitDirection.Horizontal}
          onResizeStarted={onResizeStart}
          onResizeFinished={onResizeEnd}
          initialSizes={splitterSizes || undefined}
        >
          <Browser isDragging={isDragging} />
          {moduleComponent as React.ReactNode}
        </Splitter>
      </DndContext>
      {draggedObjects && draggedObjects.length > 0 && (
        <DraggedIndicator ref={draggedIndicatorRef}>{draggedwidget}</DraggedIndicator>
      )}
    </MAMContainer>
  );
};

export default MAMPage;
