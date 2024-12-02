import {
  Navbar,
  Button,
  Spacer,
  RadioButton,
  ToolbarSeparator,
} from '/src/components'

const QC_STATE_OPTIONS = [
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
]

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
        value={assetData['qc/state'] || 0}
        options={QC_STATE_OPTIONS}
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
