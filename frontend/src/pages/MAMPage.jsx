import { useMemo, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useParams, useSearchParams } from 'react-router-dom'
import Splitter, { SplitDirection } from '@devbookhq/splitter'
import styled from 'styled-components'

import { useLocalStorage } from '/src/hooks'
import { setFocusedAsset, setSelectedAssets } from '/src/actions'
import Browser from '/src/containers/Browser'
import AssetEditor from '/src/pages/AssetEditor'
import SendToDialog from '/src/containers/SendTo'

const MAMContainer = styled.div`
  flex-grow: 1;

  .__dbk__gutter.Dark {
    background-color: var(--color-surface01);
  }

  .__dbk__child-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
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
      setSearchParams({})
      return
    }
    setSearchParams({ asset: focusedAsset })
  }, [focusedAsset])

  const componentProps = {}

  const moduleComponent = useMemo(() => {
    if (module == 'editor') return <AssetEditor {...componentProps} />

    return 'Not implemented'
  }, [module])

  // eslint-disable-next-line no-unused-vars
  const onResize = (gutter, size) => {
    setSplitterSizes(size)
  }

  return (
    <MAMContainer>
      <Splitter
        direction={SplitDirection.Horizontal}
        onResizeFinished={onResize}
        initialSizes={splitterSizes}
      >
        <Browser />
        {moduleComponent}
      </Splitter>
      <SendToDialog />
    </MAMContainer>
  )
}

export default MAMPage
