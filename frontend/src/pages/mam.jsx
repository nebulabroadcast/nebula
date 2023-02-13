import { useState, useMemo, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useParams, useSearchParams } from 'react-router-dom'
import Splitter, { SplitDirection } from '@devbookhq/splitter'
import styled from 'styled-components'

import { useLocalStorage } from '/src/hooks'
import { setFocusedAsset, setSelectedAssets } from '/src/actions'
import Browser from '/src/containers/browser'
import AssetEditor from '/src/pages/assetEditor'
import AssetPreview from '/src/pages/assetPreview'

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
`

const MAMPage = () => {
  // This is a wrapper components for all the MAM pages
  // It will render the correct page based on the URL
  // along with the browser component

  const focusedAsset = useSelector((state) => state.context.focusedAsset)
  const dispatch = useDispatch()
  const { module } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [browserReloadTrigger, setBrowserReloadTrigger] = useState(0)
  const [splitterSizes, setSplitterSizes] = useLocalStorage(
    'mamSplitterSizes',
    null
  )

  useEffect(() => {
    if (!focusedAsset && searchParams.get('asset')) {
      const assetId = parseInt(searchParams.get('asset'))
      dispatch(setFocusedAsset(assetId))
      dispatch(setSelectedAssets([assetId]))
    }
  }, [focusedAsset, searchParams.get('asset')])

  const componentProps = {
    reloadBrowser: () => setBrowserReloadTrigger((o) => o + 1),
  }

  const moduleComponent = useMemo(() => {
    if (module == 'editor') return <AssetEditor {...componentProps} />
    if (module == 'preview') return <AssetPreview {...componentProps} />

    return 'Not implemented'
  }, [module])

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
        <Browser reloadTrigger={browserReloadTrigger} />
        {moduleComponent}
      </Splitter>
    </MAMContainer>
  )
}

export default MAMPage
