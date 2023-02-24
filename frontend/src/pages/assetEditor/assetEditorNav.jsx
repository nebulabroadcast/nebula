import nebula from '/src/nebula'

import { useDispatch } from 'react-redux'
import { useState, useMemo } from 'react'
import { setCurrentViewId, setSearchQuery } from '/src/actions'
import {
  Navbar,
  Button,
  Spacer,
  Dropdown,
  ToolbarSeparator,
  InputTimecode,
  Dialog,
} from '/src/components'

import SendToDialog from '/src/containers/sendTo'
import MetadataDetail from './detail'
import ContextActionResult from './contextAction'
import UploadDialog from './uploadDialog'

import contentType from 'content-type'

const AssetEditorNav = ({
  assetData,
  onNewAsset,
  onCloneAsset,
  onRevert,
  onSave,
  setMeta,
  isChanged,
}) => {
  const [detailsVisible, setDetailsVisible] = useState(false)
  const [sendToVisible, setSendToVisible] = useState(false)
  const [uploadVisible, setUploadVisible] = useState(false)
  const [contextActionResult, setContextActionResult] = useState(null)

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

  const limited = nebula.user.is_limited

  const canAdd = Object.keys(assetData).length > 1 // id_folder is always present
  const canClone = assetData?.id && isChanged
  const canRevert = isChanged
  const canFlag = assetData?.id && !limited
  const canUpload = assetData?.id

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

      {uploadVisible && (
        <UploadDialog
          assetData={assetData}
          onHide={() => setUploadVisible(false)}
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
      />

      <InputTimecode
        value={assetData?.duration}
        fps={fps}
        onChange={(val) => setMeta('duration', val)}
        title="Duration"
        readOnly={assetData.status}
      />

      <Spacer />

      {!limited && (
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
            disabled={!assetData?.id || isChanged}
          />
        </>
      )}

      <ToolbarSeparator />

      <Button
        icon="flag"
        style={{ color: 'var(--color-text)' }}
        title="Revert QC state"
        onClick={() => setMeta('qc/state', 0)}
        className={!(assetData && assetData['qc/state']) ? 'active' : ''}
        disabled={!canFlag}
      />
      <Button
        icon="flag"
        style={{ color: 'var(--color-red)' }}
        title="Reject asset"
        onClick={() => setMeta('qc/state', 3)}
        className={assetData && assetData['qc/state'] === 3 ? 'active' : ''}
        active={assetData && assetData['qc/state'] === 3}
        disabled={!canFlag}
      />
      <Button
        icon="flag"
        style={{ color: 'var(--color-green)' }}
        title="Approve asset"
        onClick={() => setMeta('qc/state', 4)}
        className={assetData && assetData['qc/state'] === 4 ? 'active' : ''}
        active={assetData && assetData['qc/state'] === 4}
        disabled={!canFlag}
      />

      <ToolbarSeparator />

      {nebula.settings?.system?.ui_asset_upload && (
        <Button
          icon="upload"
          onClick={() => setUploadVisible(true)}
          title="Upload media file"
          disabled={!canUpload}
        />
      )}
      <Button
        icon="add"
        onClick={onNewAsset}
        title="Create new asset"
        disabled={!canAdd}
      />
      <Button
        icon="content_copy"
        onClick={onCloneAsset}
        title="Clone asset"
        disabled={!canClone}
      />
      <Button
        icon="backspace"
        title="Discard changes"
        onClick={onRevert}
        disabled={!canRevert}
      />
      <Button
        icon="check"
        title="Save asset"
        onClick={onSave}
        disabled={!isChanged}
      />
    </Navbar>
  )
}

export default AssetEditorNav
