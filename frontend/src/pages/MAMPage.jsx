import { useMemo, useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useSearchParams } from 'react-router-dom';
import Splitter, { SplitDirection } from '@devbookhq/splitter';
import styled from 'styled-components';

import { useLocalStorage } from '/src/hooks';
import { setFocusedAsset, setSelectedAssets } from '/src/actions';

import Browser from '/src/containers/Browser';
import AssetEditor from '/src/pages/AssetEditor';
import Scheduler from '/src/pages/Scheduler';
import Rundown from './Rundown';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

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

const MAMPage = () => {
  // This is a wrapper components for all the MAM pages
  // It will render the correct page based on the URL
  // along with the browser component

  const focusedAsset = useSelector((state) => state.context.focusedAsset);
  const dispatch = useDispatch();
  const { module } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [splitterSizes, setSplitterSizes] = useLocalStorage('mamSplitterSizes', null);

  const draggedIndicatorRef = useRef(null);

  // Drag and drop from the browser
  const [draggedObjects, setDraggedObjects] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const mouseSensor = useSensor(MouseSensor, {
    // Require the mouse to move by 10 pixels before activating
    activationConstraint: {
      distance: 10,
    },
  });

  const sensors = useSensors(mouseSensor);

  const setBodyCursor = (cursor) => {
    document.body.style.setProperty('cursor', cursor, 'important');
  };

  const onDragStart = (event) => {
    setIsDragging(true);
    const objects = event.active.data.current;
    console.debug('Start drag', objects);
    setDraggedObjects(event.active.data.current);
    setBodyCursor('grabbing');
  };

  const onDragEnd = (event) => {
    console.debug('End drag', event.active.data.current);
    setIsDragging(false);
    setDraggedObjects(null);
    setBodyCursor('auto');
  };

  //
  // URL handling
  //

  useEffect(() => {
    if (searchParams.get('asset')) {
      const assetId = parseInt(searchParams.get('asset'));
      if (isNaN(assetId)) return;
      if (assetId === focusedAsset) return;
      dispatch(setFocusedAsset(assetId));
      dispatch(setSelectedAssets([assetId]));
    }
  }, [searchParams.get('asset')]);

  useEffect(() => {
    if (focusedAsset === searchParams.get('asset')) return;
    if (focusedAsset === null) {
      setSearchParams((o) => {
        o.delete('asset');
        return o;
      });
      return;
    }
    setSearchParams((o) => {
      o.set('asset', focusedAsset);
      return o;
    });
  }, [focusedAsset]);

  //
  // MAM Module
  //

  const componentProps = {
    draggedObjects,
  };

  const moduleComponent = useMemo(() => {
    if (module == 'editor') return <AssetEditor {...componentProps} />;
    if (module == 'scheduler') return <Scheduler {...componentProps} />;
    if (module == 'rundown') return <Rundown {...componentProps} />;

    return 'Not implemented';
  }, [module, draggedObjects]);

  // eslint-disable-next-line no-unused-vars
  const onResizeStart = (gutter) => {
    document.body.style.userSelect = 'none';
  };
  const onResizeEnd = (gutter, size) => {
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
    const handleMouseMove = (e) => {
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
          initialSizes={splitterSizes}
        >
          <Browser isDragging={isDragging} />
          {moduleComponent}
        </Splitter>
      </DndContext>
      {draggedObjects?.length > 0 && (
        <DraggedIndicator ref={draggedIndicatorRef}>{draggedwidget}</DraggedIndicator>
      )}
    </MAMContainer>
  );
};

export default MAMPage;
