import nebula from '/src/nebula'
import styled from 'styled-components'

import { toast } from 'react-toastify'
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Dropdown,
  Spacer,
  InputTimecode,
  Navbar,
  Button,
} from '/src/components'
import VideoPlayer from '/src/containers/VideoPlayer'
import Subclip from './Subclip'
import { useKeyDown } from '/src/hooks'

const SubclipsPanel = ({
  subclips,
  setSubclips,
  selection,
  setSelection,
  fps,
}) => {
  return (
    <section className="grow">
      <div
        className="contained column"
        style={{
          overflowY: 'scroll',
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-start',
          padding: 6,
        }}
      >
        {subclips.map((subclip, index) => (
          <Subclip
            key={index}
            index={index}
            setSubclips={setSubclips}
            selection={selection}
            setSelection={setSelection}
            fps={fps}
            {...subclip}
          />
        ))}
        <Spacer />
      </div>
    </section>
  )
}

const Preview = ({ assetData, setAssetData }) => {
  const accessToken = nebula.getAccessToken()
  const [selection, setSelection] = useState({})
  const [subclips, setSubclips] = useState([])
  const [position, setPosition] = useState(0)

  // Video source

  const videoSrc = useMemo(
    () =>
      assetData.id &&
      accessToken &&
      `/proxy/${assetData.id}?token=${accessToken}`,
    [assetData, accessToken]
  )
  const frameRate = useMemo(() => {
    const fps = assetData['video/fps_f'] || 25.0
    //console.log('fps', fps)
    return fps
  }, [assetData])

  const patchAsset = (data) => {
    // helper function to update asset data
    setAssetData((o) => {
      return { ...o, ...data }
    })
  }

  useEffect(() => {
    setSelection({
      mark_in: assetData.mark_in,
      mark_out: assetData.mark_out,
    })
    setSubclips(assetData.subclips || [])
  }, [assetData?.id])

  useEffect(() => {
    // when subclip list changes, update it in asset data
    if (!assetData) return
    if ((assetData.subclips || []) !== subclips) {
      patchAsset({ subclips: subclips.length ? subclips : null })
    }
  }, [subclips])

  // Dropdown menu options for poster frame

  const setPosterFrame = () => {
    patchAsset({ poster_frame: position })
  }

  const goToPosterFrame = () => {
    setSelection({ mark_in: assetData.poster_frame, mark_out: null })
  }

  const clearPosterFrame = () => {
    patchAsset({ poster_frame: null })
  }

  const posterOptions = [
    { label: 'Set poster frame', onClick: setPosterFrame },
    { label: 'Go to poster frame', onClick: goToPosterFrame },
    { label: 'Clear poster frame', onClick: clearPosterFrame },
  ]

  // Actions

  const onSetMarks = () => {
    // Set asset mark_in and mark_out values
    // (content primary selection)
    patchAsset({
      mark_in: selection.mark_in || null,
      mark_out: selection.mark_out || null,
    })
  }

  const onNewSubclip = () => {
    if (!(selection.mark_in && selection.mark_out)) {
      toast.error('Please select a region first')
      return
    }

    if (selection.mark_in >= selection.mark_out) {
      toast.error('Please select a valid region')
      return
    }

    setSubclips((subclips) => [
      ...subclips,
      { title: `SubClip ${subclips.length + 1}`, ...selection },
    ])
  }

  // Keyboard shortcuts

  useKeyDown('v', onNewSubclip)

  // Render

  return (
    <div className="grow row">
      <div className="column" style={{ minWidth: 300, flexGrow: 1 }}>
        <VideoPlayer
          src={videoSrc}
          frameRate={frameRate}
          position={position}
          setPosition={setPosition}
          markIn={selection.mark_in}
          markOut={selection.mark_out}
          setMarkIn={(mark_in) => setSelection((s) => ({ ...s, mark_in }))}
          setMarkOut={(mark_out) => setSelection((s) => ({ ...s, mark_out }))}
          marks={{
            poster_frame: assetData.poster_frame,
          }}
        />
      </div>

      <div className="column" style={{ minWidth: 400 }}>
        <Navbar>
          <InputTimecode
            value={assetData.mark_in}
            readOnly={true}
            tooltip="Content start"
            fps={frameRate}
          />
          <InputTimecode
            value={assetData.mark_out}
            readOnly={true}
            tooltip="Content end"
            fps={frameRate}
          />
          <Button
            icon="screenshot_region"
            tooltip="Marks from selection"
            onClick={onSetMarks}
          />
          <Button
            icon="frame_inspect"
            tooltip="Marks to selection"
            onClick={() =>
              setSelection({
                mark_in: assetData.mark_in || null,
                mark_out: assetData.mark_out || null,
              })
            }
          />
          <Spacer />
          <Button icon="add" tooltip="New subclip" onClick={onNewSubclip} />
          <Dropdown icon="image" align="right" options={posterOptions} />
        </Navbar>

        <SubclipsPanel
          subclips={subclips}
          setSubclips={setSubclips}
          selection={selection}
          setSelection={setSelection}
          fps={frameRate}
        />
      </div>
    </div>
  )
}

export default Preview
