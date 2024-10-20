import nebula from '/src/nebula'

import contentType from 'content-type'
import { useDispatch } from 'react-redux'
import { useState, useMemo } from 'react'
import {
  setCurrentViewId,
  setSearchQuery,
  showSendToDialog,
} from '/src/actions'

import {
  Navbar,
  Button,
  Spacer,
  RadioButton,
  ToolbarSeparator,
  Dialog,
} from '/src/components'

import MetadataDetail from './MetadataDetail'
import ContextActionResult from './ContextAction'

const AssetEditorNav = ({
  assetData,
  onNewAsset,
  onCloneAsset,
  onRevert,
  onSave,
  setMeta,
  editorMode,
  setEditorMode,
  enabledActions,
}) => {
  const dispatch = useDispatch()

  const currentFolder = useMemo(() => {
    if (!nebula.settings.folders) return null
    for (const f of nebula.settings.folders) {
      if (f.id !== assetData?.id_folder) continue
      return f
    }
  }, [{ ...assetData }])

  return (
    <Navbar>
      <Button
        icon="add"
        onClick={onNewAsset}
        label="New asset"
        disabled={!enabledActions.create}
      />
      <Button
        icon="content_copy"
        onClick={onCloneAsset}
        label="Clone asset"
        disabled={!enabledActions.clone}
      />

      <Spacer />

      <RadioButton
        options={[
          { label: 'Edit', value: 'metadata', icon: 'edit' },
          { label: 'Preview', value: 'preview', icon: 'visibility' },
        ]}
        value={editorMode}
        onChange={setEditorMode}
      />

      <Spacer />

      <RadioButton
        value={assetData['qc/state']}
        options={[
          { value: 0, icon: 'flag', tooltip: 'Revert QC state' },
          {
            value: 3,
            icon: 'flag',
            buttonStyle: { color: 'var(--color-red)' },
            tooltip: 'Reject asset',
          },
          {
            value: 4,
            icon: 'flag',
            buttonStyle: { color: 'var(--color-green)' },
            tooltip: 'Approve asset',
          },
        ]}
        onChange={(value) => setMeta('qc/state', value)}
        disabled={!enabledActions.flag}
      />

      <ToolbarSeparator />

      <Button
        icon="backspace"
        label="Discard changes"
        onClick={onRevert}
        disabled={!enabledActions.revert}
      />
      <Button
        icon="check"
        label="Save asset"
        onClick={() => onSave()}
        disabled={!enabledActions.save}
      />
    </Navbar>
  )
}

export default AssetEditorNav
