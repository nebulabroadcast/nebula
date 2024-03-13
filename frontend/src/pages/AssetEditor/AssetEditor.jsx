import nebula from '/src/nebula'

import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { toast } from 'react-toastify'
import { isEqual, isEmpty } from 'lodash'

import { useLocalStorage, useConfirm } from '/src/hooks'
import {
  setPageTitle,
  reloadBrowser,
  setSelectedAssets,
  setFocusedAsset,
} from '/src/actions'
import { Loader } from '/src/components'

import AssetEditorNav from './EditorNav'
import EditorForm from './EditorForm'
import Preview from './Preview'

const getEnabledActions = ({ assetData, isChanged }) => {
  // Return an object with all the actions that are enabled
  // for the current asset and the current user
  // This is used to enable/disable buttons in the UI

  const limited = nebula.user.is_limited
  const writableFolderIds = nebula.getWritableFolders().map((f) => f.id)

  const edit = !(limited && assetData['qc/state'] === 4)
  const save = isChanged && edit
  const revert = isChanged

  // it does not make sense to click add, when the current asset is brand new
  // (id_folder is always present)
  const create =
    nebula.getWritableFolders().length > 0 && Object.keys(assetData).length > 1
  const clone =
    assetData.id &&
    assetData.id_folder &&
    writableFolderIds.includes(assetData.id_folder)

  const folderChange = !assetData.id && edit
  const flag = assetData.id && !nebula.user.is_limited
  const upload = assetData.id && edit
  const actions = assetData?.id && !isChanged
  const advanced = !limited

  return {
    save,
    edit,
    revert,
    folderChange,
    create,
    clone,
    actions,
    flag,
    upload,
    advanced,
  }
}

const AssetEditor = () => {
  const focusedAsset = useSelector((state) => state.context.focusedAsset)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [assetData, setAssetData] = useState({})
  const [originalData, setOriginalData] = useState({})
  const [loading, setLoading] = useState(false)
  const [ConfirmDialog, confirm] = useConfirm()
  const [previewVisible, setPreviewVisible] = useLocalStorage(
    'previewVisible',
    false
  )

  // Load asset data

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

  // Update a single asset meta field
  // (called by EditorForm, flag buttons, etc.)

  const setMeta = (key, value, instant) => {
    if (key === 'id_folder' && isEmpty(assetData)) {
      setOriginalData({ id_folder: value })
    }
    if (instant) {
      onSave({ [key]: value })
    } else {
      setAssetData((o) => {
        return { ...o, [key]: value }
      })
    }
  }

  // If the asset is new, set the default folder
  // (first writable folder)

  useEffect(() => {
    if (!assetData?.id_folder)
      setMeta('id_folder', nebula.getWritableFolders()[0]?.id)
  }, [assetData?.id_folder])

  // Parse and show asset data

  useEffect(() => {
    if (assetData.id) {
      let title = assetData.title
      if (assetData.subtitle) {
        const separator = nebula.settings.system.subtitle_separator || ' - '
        title = `${title}${separator}${assetData.subtitle}`
      }

      dispatch(setPageTitle({ title }))
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

  // Are there unsaved changes?
  // ATM it return true if any field is changed,
  // but it could be changed to return an array of changed fields

  const isChanged = useMemo(() => {
    let changed = []
    for (const key in assetData) {
      if (!isEqual(originalData[key] || null, assetData[key] || null)) {
        return true
        //changed.push(key)
      }
    }
    return changed.length
  }, [assetData, originalData])

  // Which actions are enabled (save, revert, etc.)
  // This is used to disable buttons when there are no changes
  // as well as disable the handlers (since save may be called using a shortcut)

  const enabledActions = useMemo(() => {
    return getEnabledActions({ assetData, isChanged })
  }, [assetData, isChanged])

  // When another asset is selected,
  // check if there are unsaved changes and ask to save them

  const switchAsset = async () => {
    if (isChanged) {
      const ans = await confirm(
        'Unsaved changes',
        'There are unsaved changes. Do you want to save them?'
      )

      if (ans) {
        nebula
          .request('set', { id: assetData.id, data: assetData })
          .then(() => {
            assetData.id || dispatch(reloadBrowser())
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
  }

  useEffect(() => {
    if (!focusedAsset) return
    switchAsset()
  }, [focusedAsset])

  // Actions

  const onNewAsset = () => {
    const currentFolder = assetData.id_folder
    dispatch(setSelectedAssets([]))
    dispatch(setFocusedAsset(null))
    if (
      nebula
        .getWritableFolders()
        .map((f) => f.id)
        .includes(currentFolder)
    ) {
      setAssetData({ id_folder: currentFolder })
      setOriginalData({ id_folder: currentFolder })
    } else {
      setAssetData({})
      setOriginalData({})
    }
  }

  const onCloneAsset = () => {
    let ndata = {}
    for (const field in assetData) {
      if (
        nebula.metaType(field).ns === 'm' ||
        ['duration', 'id_folder'].includes(field)
      )
        ndata[field] = assetData[field]
    }
    dispatch(setSelectedAssets([]))
    dispatch(setFocusedAsset(null))
    setAssetData(ndata)
  }

  const onRevert = () => {
    if (!enabledActions.revert) return
    setAssetData(originalData)
  }

  const onSave = (payload) => {
    if (!enabledActions.save && !payload) {
      return
    }
    setLoading(true)
    // console.log('Saving...', assetData)
    nebula
      .request('set', { id: assetData.id, data: payload || assetData })
      .then((response) => {
        //reload browser if it's a new asset
        assetData.id || dispatch(reloadBrowser())
        loadAsset(response.data.id)
      })
      .catch((error) => {
        toast.error(
          <>
            <strong>Unable to save asset</strong>
            <p>{error.response?.data?.detail || 'Unknown error'}</p>
          </>
        )
      })
      .finally(() => {
        setLoading(false)
      })
  }

  // Keyboard shortcuts

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault()
        onSave()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

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
        previewVisible={previewVisible}
        setPreviewVisible={setPreviewVisible}
        enabledActions={enabledActions}
      />

      {Object.keys(assetData || {}).length ? (
        <div className="grow row">
          <section
            className={`grow column ${isChanged ? 'section-changed' : ''}`}
            style={{ minWidth: 500 }}
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
                onSave={onSave}
                originalData={originalData}
                assetData={assetData}
                setAssetData={setAssetData}
                fields={fields}
                disabled={!enabledActions.edit}
              />
            </div>
          </section>

          {previewVisible && (
            <Preview assetData={assetData} setAssetData={setAssetData} />
          )}
        </div>
      ) : null}
      <ConfirmDialog />
    </div>
  )
}

export default AssetEditor
