import nebula from '/src/nebula'
import styled from 'styled-components'
import { Timecode } from '@wfoxall/timeframe'

import { toast } from 'react-toastify'
import { useState, useEffect, useCallback } from 'react'
import {
  Dropdown,
  Spacer,
  InputText,
  InputTimecode,
  Navbar,
  Button,
} from '/src/components'
import VideoPlayer from '/src/containers/VideoPlayer'


const SubclipRow = styled.div`
  display: flex;
  gap: 8px;
  padding: 4px;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--color-border);
`

const SubclipContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  background-color: var(--color-surface-03);
  border: 1px solid var(--color-surface-04);
  width: 100%;

  h3 {
    font-family: monospace;
    font-size: 12px;
    margin: 0;
    padding: 4px;
  }

`


const Subclip = ({
  index,
  title,
  mark_in,
  mark_out,
  setSubclips,
  selection,
  setSelection,
}) => {
  const onSetMarks = (marks) => {
    setSubclips((subclips) => {
      const newSubclips = [...subclips]
      newSubclips[index] = { ...newSubclips[index], ...marks }
      return newSubclips
    })
  }

  const onTitleChange = (e) => {
    setSubclips((subclips) => {
      const newSubclips = [...subclips]
      newSubclips[index] = { ...newSubclips[index], title: e }
      return newSubclips
    })
  }

  const onRemove = () => {
    setSubclips((subclips) => {
      const newSubclips = [...subclips]
      newSubclips.splice(index, 1)
      return newSubclips
    })
  }

  const fps = 25
  const startTC = new Timecode(mark_in*fps, fps)
  const endTC = new Timecode(mark_out*fps, fps)

  return (
    <SubclipContainer>
      <h3>{startTC.toString()} - {endTC.toString()}</h3>
      <SubclipRow>
        <InputText
          value={title} 
          onChange={onTitleChange} 
          style={{ flex: 1 }}
        />
        <Button
          icon="delete"
          tooltip="Delete subclip"
          onClick={() => onRemove()}
        />
        <Button
          icon="download"
          tooltip="From selection"
          onClick={() => onSetMarks(selection)}
        />
        <Button
          icon="upload"
          tooltip="From selection"
          onClick={() =>
            setSelection({ mark_in: mark_in || null, mark_out: mark_out || null })
          }
        />
      </SubclipRow>
    </SubclipContainer>
  )
}

const Preview = ({ assetData, setAssetData }) => {
  const accessToken = nebula.getAccessToken()
  const [selection, setSelection] = useState({})
  const [subclips, setSubclips] = useState([])
  const [position, setPosition] = useState(0)

  useEffect(() => {
    setSelection({})
    setSubclips(assetData.subclips || [])
  }, [assetData?.id])

  useEffect(() => {
    if (!assetData) return
    if ((assetData.subclips || []) !== subclips) {
      setAssetData((assetData) => ({
        ...assetData,
        subclips: subclips.length ? subclips : null,
      }))
    }
  }, [subclips])

  const onSetMarks = () => {
    setAssetData((o) => {
      return {
        ...o,
        mark_in: selection.mark_in || null,
        mark_out: selection.mark_out || null,
      }
    })
  }

  const videoSrc =
    assetData.id && accessToken && `/proxy/${assetData.id}?token=${accessToken}`

  const posterOptions = [
    {
      label: 'Set poster frame',
      onClick: () => {
        setAssetData((o) => {
          return { ...o, poster_frame: position }
        })
      },
    },
    {
      label: 'Go to poster frame',
      onClick: () => {
        setPosition(assetData.poster_frame)
      },
    },
    {
      label: 'Clear poster frame',
      onClick: () => {
        setAssetData((o) => {
          return { ...o, poster_frame: null }
        })
      },
    },
  ]


  // Actions
  
  const onNewSubclip = useCallback(() => {
      if (!(selection.mark_in && selection.mark_out)) {
        toast.error('Please select a region first')
        return
      }
      setSubclips((subclips) => [
        ...subclips,
        { title: `SubClip ${subclips.length + 1}`, ...selection },
      ])
    }, [selection])



  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'v') {
        onNewSubclip()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNewSubclip])


  // Render

  return (
    <div className="grow row">
      <div className="column" style={{ minWidth: 300, flexGrow: 1 }}>
        <VideoPlayer
          src={videoSrc}
          position={position}
          setPosition={setPosition}

          markIn={selection.mark_in}
          markOut={selection.mark_out}
          setMarkIn={(mark_in) => setSelection((s) => ({ ...s, mark_in }))}
          setMarkOut={(mark_out) => setSelection((s) => ({ ...s, mark_out }))}

          marks={{
            poster_frame: assetData.poster_frame 
          }}
        />
      </div>

      <div className="column" style={{ minWidth: 400 }}>
        <Navbar>
          <InputTimecode
            value={assetData.mark_in}
            readOnly={true}
            tooltip="Content start"
          />
          <InputTimecode
            value={assetData.mark_out}
            readOnly={true}
            tooltip="Content end"
          />
          <Button
            icon="download"
            tooltip="Marks from selection"
            onClick={onSetMarks}
          />
          <Button
            icon="upload"
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
                {...subclip}
              />
            ))}
            <Spacer />
          </div>
        </section>
      </div>
    </div>
  )
}

export default Preview
