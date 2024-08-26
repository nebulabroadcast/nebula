import PreviewNav from './PreviewNav'
import VideoPlayer from '/src/containers/VideoPlayer'
import { useSelector } from 'react-redux'
import nebula from '/src/nebula'

const AssetPreview = () => {
  const assetId = useSelector((state) => state.context.focusedAsset)
  const accessToken = nebula.getAccessToken()

  const src = assetId && `/proxy/${assetId}?token=${accessToken}`

  return (
    <div className="grow column">
      <PreviewNav />
      <VideoPlayer src={src} />
    </div>
  )
}

export default AssetPreview
