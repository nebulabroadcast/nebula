import nebula from '/src/nebula'

import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import { setPageTitle } from '/src/actions'
import { Video, Navbar, Spacer, Button } from '/src/components'
//import Regions from './regions'
import styled from 'styled-components'

const ControlsWrapper = styled.div`
  display: flex;
  flex-direction: row;
  gap: 6px;
  flex-grow: 1;
`

const AssetDetail = () => {
  const context = useSelector((state) => ({ ...state.context }))
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [assetData, setAssetData] = useState(null)
  const [marks, setMarks] = useState({})

  useEffect(() => {
    if (!context.focusedAsset) {
      dispatch(setPageTitle({ title: 'Preview' }))
      return
    }
    nebula
      .request('get', { ids: [context.focusedAsset], objectType: 'asset' })
      .then((response) => {
        setAssetData(response.data.data[0])
        setMarks({
          mark_in: response.data.data[0].mark_in,
          mark_out: response.data.data[0].mark_out,
        })
        navigate({
          pathname: `/mam/preview`,
          search: `?asset=${context.focusedAsset}`,
        })
      })
  }, [context.focusedAsset])

  useEffect(() => {
    if (!assetData) return
    dispatch(setPageTitle({ title: assetData.title }))
  }, [assetData])

  const onSave = () => {
    nebula
      .request('set', {
        id: assetData.id,
        data: {
          mark_in: marks.mark_in || null,
          mark_out: marks.mark_out || null,
        },
      })
      .then(() => {
        toast.success('Marks saved')
      })
      .catch((error) => {
        toast.error(error.response.detail)
      })
  }

  const accessToken = nebula.getAccessToken()

  return (
    <div className="grow column">
      <Navbar>
        <Spacer />
        <Button icon="check" onClick={onSave} />
      </Navbar>
      {assetData?.id && (
        <ControlsWrapper>
          <section style={{ minWidth: 350, flexGrow: 1 }}>
            <Video
              src={`/proxy/${assetData.id}?token=${accessToken}`}
              style={{ width: '100%' }}
              showMarks={true}
              marks={marks}
              setMarks={setMarks}
            />
          </section>

          {/*
          <section style={{ minWidth: 300, flexGrow: 1, overflowY: 'auto' }}>
            <Regions assetData={assetData} />
          </section>
          */}
        </ControlsWrapper>
      )}
    </div>
  )
}

export default AssetDetail
