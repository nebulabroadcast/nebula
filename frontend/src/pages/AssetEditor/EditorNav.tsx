import React from 'react';

import { Navbar, Button, Spacer, RadioButton, ToolbarSeparator } from '@/components';

interface AssetEditorNavProps {
  assetData: Record<string, any>;
  onNewAsset: () => void;
  onCloneAsset: () => void;
  onRevert: () => void;
  onSave: (payload?: Record<string, any>) => void;
  setMeta: (key: string, value: any, instant?: boolean) => void;
  editorMode: 'metadata' | 'preview';
  setEditorMode: (mode: 'metadata' | 'preview') => void;
  enabledActions: {
    create: boolean;
    clone: boolean;
    revert: boolean;
    save: boolean;
    flag: boolean;
  };
}

const QC_STATE_OPTIONS = [
  {
    value: 0,
    icon: 'flag',
    buttonStyle: { color: 'var(--color-text)' },
    description: 'Revert QC state',
    title: '',
  },
  {
    value: 3,
    icon: 'flag',
    buttonStyle: { color: 'var(--color-red)' },
    description: 'Reject asset',
    title: '',
  },
  {
    value: 4,
    icon: 'flag',
    buttonStyle: { color: 'var(--color-green)' },
    description: 'Approve asset',
    title: '',
  },
];

const AssetEditorNav: React.FC<AssetEditorNavProps> = ({
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
          { title: 'Edit', value: 'metadata', icon: 'edit' },
          { title: 'Preview', value: 'preview', icon: 'visibility' },
        ]}
        value={editorMode}
        onChange={setEditorMode as (mode: string) => void}
      />

      <Spacer />

      <RadioButton
        value={String(assetData['qc/state'] || 0)}
        options={QC_STATE_OPTIONS.map((opt) => ({ ...opt, value: String(opt.value) }))}
        onChange={(value) => {
          setMeta('qc/state', parseInt(value, 10));
        }}
        disabled={!enabledActions.flag}
      />

      <ToolbarSeparator />

      <Button
        icon="close"
        label="Discard changes"
        onClick={onRevert}
        disabled={!enabledActions.revert}
        hlColor="var(--color-red)"
      />
      <Button
        icon="check"
        label="Save asset"
        onClick={() => {
          onSave();
        }}
        disabled={!enabledActions.save}
        hlColor="var(--color-green)"
      />
    </Navbar>
  );
};

export default AssetEditorNav;
