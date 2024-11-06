import { useMemo, useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useParams, useSearchParams } from 'react-router-dom'
import Splitter, { SplitDirection } from '@devbookhq/splitter'
import styled from 'styled-components'

import { useLocalStorage } from '/src/hooks'
import { setFocusedAsset, setSelectedAssets } from '/src/actions'

import Browser from '/src/containers/Browser'
import AssetEditor from '/src/pages/AssetEditor'
import Scheduler from '/src/pages/Scheduler'
import Rundown from './Rundown'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import SendToDialog from '/src/containers/SendTo'

const MAMContainer = styled.div`
  flex-grow: 1;

  .__dbk__gutter.Dark {
    background-color: var(--color-surface01);
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
`

const MAMPage = () => {
  // This is a wrapper components for all the MAM pages
  // It will render the correct page based on the URL
  // along with the browser component

  const focusedAsset = useSelector((state) => state.context.focusedAsset)
  const dispatch = useDispatch()
  const { module } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [splitterSizes, setSplitterSizes] = useLocalStorage(
    'mamSplitterSizes',
    null
  )

  // Drag and drop from the browser
  const [draggedObject, setDraggedObject] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const mouseSensor = useSensor(MouseSensor, {
    // Require the mouse to move by 10 pixels before activating
    activationConstraint: {
      distance: 10,
    },
  })

  const sensors = useSensors(mouseSensor)

  const setBodyCursor = (cursor) => {
    document.body.style.setProperty('cursor', cursor, 'important')
  }

  const onDragStart = (event) => {
    setIsDragging(true)
    console.log('Start drag', event.active.data.current)
    setDraggedObject(event.active.data.current)
    setBodyCursor('grabbing')

    if (event.active.id === focusedAsset) return
    dispatch(setFocusedAsset(event.active.id))
    dispatch(setSelectedAssets([event.active.id]))
  }

  const onDragEnd = (event) => {
    setIsDragging(false)
    setDraggedObject(null)
    const { active, over } = event
    setBodyCursor('auto')
  }

  const onDragCancel = () => {
    setIsDragging(false)
    setDraggedObject(null)
  }

  //
  // URL handling
  //

  useEffect(() => {
    if (searchParams.get('asset')) {
      const assetId = parseInt(searchParams.get('asset'))
      if (assetId === focusedAsset) return
      dispatch(setFocusedAsset(assetId))
      dispatch(setSelectedAssets([assetId]))
    }
  }, [searchParams.get('asset')])

  useEffect(() => {
    if (focusedAsset === searchParams.get('asset')) return
    if (focusedAsset === null) {
      setSearchParams((o) => {
        o.delete('asset')
        return o
      })
      return
    }
    console.log('set asset')
    setSearchParams((o) => {
      o.set('asset', focusedAsset)
      return o
    })
  }, [focusedAsset])

  //
  // MAM Module
  //

  const componentProps = {
    draggedObject,
  }

  const moduleComponent = useMemo(() => {
    if (module == 'editor') return <AssetEditor {...componentProps} />
    if (module == 'scheduler') return <Scheduler {...componentProps} />
    if (module == 'rundown') return <Rundown {...componentProps} />

    return 'Not implemented'
  }, [module, draggedObject])

  // eslint-disable-next-line no-unused-vars
  const onResize = (gutter, size) => {
    setSplitterSizes(size)
  }

  //
  // Render
  //

  return (
    <MAMContainer>
      <DndContext
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
        sensors={sensors}
      >
        <Splitter
          direction={SplitDirection.Horizontal}
          onResizeFinished={onResize}
          initialSizes={splitterSizes}
        >
          <Browser isDragging={isDragging} />
          {moduleComponent}
        </Splitter>
      </DndContext>
      <SendToDialog />
    </MAMContainer>
  )
}

export default MAMPage
