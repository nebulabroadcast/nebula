import nebula from '/src/nebula'

import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { toast } from 'react-toastify'
import { isEqual, isEmpty } from 'lodash'

import { setPageTitle, reloadBrowser } from '/src/actions'
import { Loader } from '/src/components'
import AssetEditorNav from './assetEditorNav'
import EditorForm from './assetEditorForm'


const AssetEditor = () => {
  const focusedAsset = useSelector((state) => state.context.focusedAsset)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [assetData, setAssetData] = useState({})
  const [originalData, setOriginalData] = useState({})
  const [loading, setLoading] = useState(false)

  const loadAsset = (id_asset) => {
    setLoading(true)
    nebula
      .request('get', { ids: [id_asset], type: 'asset' })
      .then((response) => {
        setAssetData(response.data.data[0])
        setOriginalData(response.data.data[0])
        navigate({ pathname: `/mam/editor`, search: `?asset=${id_asset}` })
      })
      .catch((error) => {
        toast.error(
          <>
            <strong>Unable to load asset</strong>
            <p>{error.response.data?.detail || 'Unknown error'}</p>
          </>
        )
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const setMeta = (key, value) => {
    if (key === 'id_folder' && isEmpty(assetData)) {
      setOriginalData({ id_folder: value })
    }
    setAssetData((o) => {
      return { ...o, [key]: value }
    })
  }

  // Parse and show asset data


  useEffect(() => {
    if (!assetData?.id_folder)
      setMeta('id_folder', nebula.settings.folders[0].id)
  }, [assetData?.id_folder])

  useEffect(() => {
    if (assetData.id) {
      dispatch(setPageTitle({ title: assetData.title }))
    } else {
      const folderName = assetData.id_folder
        ? nebula.getFolderName(assetData.id_folder).toLowerCase()
        : 'asset'
      dispatch(setPageTitle({ title: folderName, icon: 'fiber_new' }))
    }
  }, [assetData?.id, assetData?.id_folder])

  // Which fields are visible in the editor

  const fields = useMemo(() => {
    if (!assetData?.id_folder) return []
    for (const folder of nebula.settings.folders) {
      if (folder.id !== assetData.id_folder) continue
      return folder.fields
    }
  }, [assetData, originalData])

  const isChanged = useMemo(() => {
    return !isEqual(assetData, originalData)
  }, [assetData, originalData])



  useEffect(() => {
    if (!focusedAsset) return
    if (isChanged) {
      const confirm = window.confirm(
        'There are unsaved changes. Do you want to save them?'
        )

      if (confirm) {
        nebula
          .request('set', { id: assetData.id, data: assetData })
          .then((response) => {
            dispatch(reloadBrowser())
          })
          .catch((error) => {
            toast.error(
              <>
                <strong>Unable to save asset</strong>
                <p>{error.response.data?.detail || 'Unknown error'}</p>
              </>
            )
          })
          .finally(() => {
            loadAsset(focusedAsset)
          })
      } else {
        loadAsset(focusedAsset)
      }
    } else {
      loadAsset(focusedAsset)
    }
  }, [focusedAsset])

  // Actions

  const onNewAsset = () => {
    setAssetData({})
  }
  const onCloneAsset = () => {
    let ndata = {}
    for (const field in assetData) {
      if (nebula.metaType(field).ns === 'm' || field === 'duration')
        ndata[field] = assetData[field]
    }
    setAssetData(ndata)
  }

  const onRevert = () => {
    setAssetData(originalData)
  }

  const onSave = () => {
    nebula
      .request('set', { id: assetData.id, data: assetData })
      .then((response) => {
        loadAsset(response.data.id)
        dispatch(reloadBrowser())
      })
      .catch((error) => {
        toast.error(
          <>
            <strong>Unable to save asset</strong>
            <p>{error.response.data?.detail || 'Unknown error'}</p>
          </>
        )
      })
  }

  // Render

  return (
    <div className="grow column">
      <AssetEditorNav
        assetData={assetData}
        onNewAsset={onNewAsset}
        onCloneAsset={onCloneAsset}
        onRevert={onRevert}
        onSave={onSave}
        setMeta={setMeta}
        isChanged={isChanged}
      />
      {Object.keys(assetData || {}).length ? (
        <section
          className={`grow column ${isChanged ? 'section-changed' : ''}`}
        >
          <div
            className="contained"
            style={{ overflowY: 'scroll', padding: 10 }}
          >
            {loading && (
              <div className="contained center">
                <Loader />
              </div>
            )}
            <EditorForm
              originalData={originalData}
              assetData={assetData}
              setAssetData={setAssetData}
              fields={fields}
            />
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default AssetEditor
