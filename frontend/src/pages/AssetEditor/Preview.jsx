import nebula from '/src/nebula'
import styled from 'styled-components'

import { toast } from 'react-toastify'
import { useState, useEffect } from 'react'
import {
  Dropdown,
  Video,
  Spacer,
  InputText,
  InputTimecode,
  Button,
} from '/src/components'

const RegionRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: 6px;
  justify-content: flex-start;
  align-items: center;
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

  const onInChange = (e) => {
    setSubclips((subclips) => {
      const newSubclips = [...subclips]
      newSubclips[index] = { ...newSubclips[index], mark_in: e }
      return newSubclips
    })
  }

  const onOutChange = (e) => {
    setSubclips((subclips) => {
      const newSubclips = [...subclips]
      newSubclips[index] = { ...newSubclips[index], mark_out: e }
      return newSubclips
    })
  }

  return (
    <RegionRow>
      <InputText value={title} onChange={onTitleChange} />
      <InputTimecode value={mark_in} onChange={onInChange} />
      <InputTimecode value={mark_out} onChange={onOutChange} />
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
      <Button
        icon="delete"
        tooltip="Delete subclip"
        onClick={() => onRemove()}
      />
    </RegionRow>
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

  return (
    <div className="grow column" style={{ minWidth: 300, maxWidth: 600 }}>
      <section className="column">
        <Video
          src={videoSrc}
          style={{ width: '100%' }}
          showMarks={true}
          marks={{ ...selection, poster_frame: assetData.poster_frame }}
          setMarks={setSelection}
          position={position}
          setPosition={setPosition}
        />
      </section>
      <section className="column">
        <RegionRow>
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
          <Button
            icon="add"
            tooltip="New subclip"
            onClick={() => {
              if (!(selection.mark_in && selection.mark_out)) {
                toast.error('Please select a region first')
                return
              }
              setSubclips((subclips) => [
                ...subclips,
                { title: `SubClip ${subclips.length + 1}`, ...selection },
              ])
            }}
          />
          <Dropdown icon="image" align="right" options={posterOptions} />
        </RegionRow>
      </section>

      <section className="column grow">
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
  )
}

export default Preview
