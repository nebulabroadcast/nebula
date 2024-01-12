import nebula from '/src/nebula'

import { toast } from 'react-toastify'
import { useSelector, useDispatch } from 'react-redux'
import { useState, useMemo } from 'react'
import { setCurrentViewId, setSearchQuery, reloadBrowser } from '/src/actions'
import {
  Navbar,
  Button,
  Spacer,
  Dropdown,
  ToolbarSeparator,
  InputTimecode,
  Dialog,
} from '/src/components'

import { UploadButton } from '/src/containers/Upload'
import { SendToDialog } from '/src/containers/SendTo'

import MetadataDetail from './MetadataDetail'
import ContextActionResult from './ContextAction'
import AssigneesButton from './AssigneesButton'

import contentType from 'content-type'

const AssetEditorNav = ({
  assetData,
  onNewAsset,
  onCloneAsset,
  onRevert,
  onSave,
  setMeta,
  previewVisible,
  setPreviewVisible,
  enabledActions,
}) => {
  const [detailsVisible, setDetailsVisible] = useState(false)
  const [sendToVisible, setSendToVisible] = useState(false)
  const [contextActionResult, setContextActionResult] = useState(null)
  const selectedAssets = useSelector((state) => state.context.selectedAssets)

  const dispatch = useDispatch()

  const currentFolder = useMemo(() => {
    if (!nebula.settings.folders) return null
    for (const f of nebula.settings.folders) {
      if (f.id !== assetData?.id_folder) continue
      return f
    }
  }, [{ ...assetData }])

  const folderOptions = useMemo(() => {
    return nebula.getWritableFolders().map((f) => ({
      label: f.name,
      style: { borderLeft: `4px solid ${f.color}` },
      onClick: () => setMeta('id_folder', f.id),
    }))
  }, [])

  // Actions

  const setSelectionStatus = (status) => {
    const operations = selectedAssets.map((id) => ({
      id,
      data: { status },
    }))
    nebula
      .request('ops', { operations })
      .then(() => {
        toast.success('Request accepted')
        dispatch(reloadBrowser())
      })
      .catch((error) => {
        toast.error(error.response.detail)
      })
  }

  const scopedEndpoints = useMemo(() => {
    const result = []
    for (const scopedEndpoints of nebula.getScopedEndpoints('asset')) {
      result.push({
        label: scopedEndpoints.title,
        onClick: () => {
          nebula
            .request(scopedEndpoints.endpoint, { id_asset: assetData.id })
            .then((response) => {
              setContextActionResult({
                contentType: contentType.parse(response.headers['content-type'])
                  .type,
                payload: response.data,
              })
            })
        },
      })
    }
    return result
  }, [assetData.id])

  const linkOptions = useMemo(() => {
    if (!currentFolder) return []

    return currentFolder.links.map((l) => ({
      label: l.name,
      disabled: !assetData[l['source_key']],
      onClick: () => {
        const query = `${l['target_key']}:${assetData[l['source_key']]}`
        dispatch(setCurrentViewId(l.view))
        dispatch(setSearchQuery(query))
      },
    }))
  }, [currentFolder])

  const assetActions = useMemo(() => {
    const result = [
      {
        label: 'Send to...',
        onClick: () => setSendToVisible(true),
      },
      {
        label: 'Reset',
        disabled: assetData.status !== 1,
        onClick: () => {
          //setMeta('status', 5, true)
          setSelectionStatus(5)
        },
      },
      ...scopedEndpoints,
      ...linkOptions,
    ]
    return result
  }, [scopedEndpoints, linkOptions])

  // End actions

  const fps = useMemo(() => {
    if (!assetData) return 25
    return assetData['video/fps_f'] || 25
  }, [assetData['video/fps_f']])

  return (
    <Navbar>
      {detailsVisible && (
        <Dialog
          style={{ height: '80%', width: '80%' }}
          onHide={() => setDetailsVisible(false)}
        >
          <MetadataDetail assetData={assetData} />
        </Dialog>
      )}

      {sendToVisible && (
        <SendToDialog
          assets={[assetData.id]}
          onHide={() => setSendToVisible(false)}
        />
      )}

      {contextActionResult && (
        <ContextActionResult
          mime={contextActionResult.contentType}
          payload={contextActionResult.payload}
          onHide={() => setContextActionResult(null)}
        />
      )}

      <Dropdown
        options={folderOptions}
        buttonStyle={{
          borderLeft: ` 4px solid ${currentFolder?.color}`,
          minWidth: 130,
          width: 130,
        }}
        label={currentFolder?.name || 'no folder'}
        disabled={!enabledActions.folderChange}
      />

      <InputTimecode
        value={assetData?.duration}
        fps={fps}
        onChange={(val) => setMeta('duration', val)}
        title="Duration"
        readOnly={assetData.status || !enabledActions.edit}
      />

      <ToolbarSeparator />

      <Button
        icon="add"
        onClick={onNewAsset}
        title="Create new asset"
        disabled={!enabledActions.create}
      />
      <Button
        icon="content_copy"
        onClick={onCloneAsset}
        title="Clone asset"
        disabled={!enabledActions.clone}
      />

      <Spacer />

      {enabledActions.advanced && (
        <>
          <Button
            icon="manage_search"
            title="Details"
            onClick={() => setDetailsVisible(true)}
          />
          <Dropdown
            icon="settings"
            align="right"
            options={assetActions}
            disabled={!enabledActions.actions}
          />
          <AssigneesButton
            assignees={assetData?.assignees || []}
            setAssignees={(val) => setMeta('assignees', val)}
          />
        </>
      )}

      {nebula.settings.system.ui_asset_preview && (
        <Button
          icon="visibility"
          onClick={() => setPreviewVisible(!previewVisible)}
          active={previewVisible}
          title="Preview"
        />
      )}

      <ToolbarSeparator />

      <Button
        icon="flag"
        style={{ color: 'var(--color-text)' }}
        title="Revert QC state"
        onClick={() => setMeta('qc/state', 0)}
        className={!(assetData && assetData['qc/state']) ? 'active' : ''}
        disabled={!enabledActions.flag}
      />
      <Button
        icon="flag"
        style={{ color: 'var(--color-red)' }}
        title="Reject asset"
        onClick={() => setMeta('qc/state', 3)}
        className={assetData && assetData['qc/state'] === 3 ? 'active' : ''}
        active={assetData && assetData['qc/state'] === 3}
        disabled={!enabledActions.flag}
      />
      <Button
        icon="flag"
        style={{ color: 'var(--color-green)' }}
        title="Approve asset"
        onClick={() => setMeta('qc/state', 4)}
        className={assetData && assetData['qc/state'] === 4 ? 'active' : ''}
        active={assetData && assetData['qc/state'] === 4}
        disabled={!enabledActions.flag}
      />

      <ToolbarSeparator />

      {nebula.settings?.system?.ui_asset_upload && (
        <UploadButton assetData={assetData} disabled={!enabledActions.upload} />
      )}
      <Button
        icon="backspace"
        title="Discard changes"
        onClick={onRevert}
        disabled={!enabledActions.revert}
      />
      <Button
        icon="check"
        title="Save asset"
        onClick={() => onSave()}
        disabled={!enabledActions.save}
      />
    </Navbar>
  )
}

export default AssetEditorNav
