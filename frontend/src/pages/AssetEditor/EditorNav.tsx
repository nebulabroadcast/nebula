import contentType from 'content-type';
import React, { useState, useMemo, useCallback } from 'react';

import ContextActionResult from './ContextAction';
import MetadataDetail from './MetadataDetail';

import {
  Navbar,
  Button,
  Spacer,
  RadioButton,
  Dropdown,
  ToolbarSeparator,
  Dialog,
} from '@/components';
import type { DropdownOptionProps } from '@/components/Dropdown';
import { useDialog } from '@/features/Dialogs';
import { MediaUploadDialog, useMediaUpload } from '@/features/MediaUpload';
import { useNebula } from '@/features/Nebula';
import nebula from '@/nebula';
import type { EnabledActions } from './types';

interface AssetEditorNavProps {
  assetData: Record<string, any>;
  onNewAsset: () => void;
  onCloneAsset: () => void;
  onRevert: () => void;
  onSave: (payload?: Record<string, any>) => void;
  setMeta: (key: string, value: any, instant?: boolean) => void;
  editorMode: 'metadata' | 'preview';
  setEditorMode: (mode: 'metadata' | 'preview') => void;
  enabledActions: EnabledActions;
  showJobs: boolean;
  setShowJobs: (value: boolean | ((val: boolean) => boolean)) => void;
}

interface FolderLink {
  name: string;
  source_key: string;
  target_key: string;
  view: number;
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
  showJobs,
  setShowJobs,
}) => {
  const [contextActionResult, setContextActionResult] = useState<{
    contentType: string;
    payload: any;
  } | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  const showDialog = useDialog();
  const { setCurrentView, setSearchQuery } = useNebula();
  const { queue } = useMediaUpload();

  // There's already an upload task for this asset in the queue
  const isUploading = queue.some(
    (task) =>
      task.id === assetData.id &&
      (task.status === 'queued' || task.status === 'uploading')
  );

  const currentFolder = useMemo(() => {
    if (!nebula.settings?.folders) return null;
    return nebula.settings.folders.find((f) => f.id === assetData?.id_folder) || null;
  }, [assetData.id_folder]);

  const scopedEndpoints = useMemo((): DropdownOptionProps[] => {
    const result: DropdownOptionProps[] = [];
    if (!assetData?.id) return result;
    const assetId = assetData.id as number;
    const endpoints = nebula.getScopedEndpoints('asset');
    for (const endpoint of endpoints) {
      result.push({
        label: endpoint.title,
        onClick: () => {
          void nebula
            .request(endpoint.endpoint, { id_asset: assetId })
            .then((response) => {
              const ct = response.headers['content-type'] as string;
              setContextActionResult({
                contentType: ct ? contentType.parse(ct).type : 'application/json',
                payload: response.data,
              });
            })
            .catch((err: unknown) => {
              console.error(err);
            });
        },
      });
    }
    return result;
  }, [assetData.id]);

  const linkOptions = useMemo((): DropdownOptionProps[] => {
    if (!currentFolder?.links) return [];

    const links = currentFolder.links as FolderLink[];
    return links.map((l) => ({
      label: l.name,
      disabled: !assetData[l.source_key],
      onClick: () => {
        const val = assetData[l.source_key] as string | number;
        const query = `${l.target_key}:${val}`;
        setCurrentView(l.view);
        setSearchQuery(query);
      },
    }));
  }, [assetData, currentFolder, setCurrentView, setSearchQuery]);

  const sendTo = useCallback(() => {
    if (!assetData?.id) return;
    void showDialog('sendto', 'Send to...', { assets: [assetData.id as number] })
      .then(() => {
        /* noop */
      })
      .catch(() => {
        /* noop */
      });
  }, [assetData.id, showDialog]);

  const spreadsheetIngest = useCallback(() => {
    if (!currentFolder) return;
    showDialog('spreadsheet', `Spreadsheet ingest: ${currentFolder.name}`, {
      folderId: currentFolder.id,
      // an existing asset is used as an example row of the template
      example: assetData.id ? assetData : undefined,
    }).catch(() => {
      // dismissed. the dialog reloads the browser itself if any asset was created
    });
  }, [currentFolder, assetData, showDialog]);

  const assetActions = useMemo((): DropdownOptionProps[] => {
    const result: DropdownOptionProps[] = [
      {
        label: 'Send to...',
        disabled: !assetData?.id,
        icon: 'send',
        onClick: () => {
          sendTo();
        },
      },
    ];
    if (nebula.settings?.system?.ui_asset_upload) {
      result.push({
        label: isUploading ? 'Uploading...' : 'Upload media',
        icon: 'upload',
        disabled: !enabledActions.upload || isUploading,
        onClick: () => {
          setUploadVisible(true);
        },
      });
    }
    result.push(
      {
        label: 'Spreadsheet ingest',
        icon: 'table_view',
        disabled: !enabledActions.spreadsheetIngest,
        onClick: spreadsheetIngest,
        separator: true,
      },
      {
        label: showJobs ? 'Hide jobs' : 'Show jobs',
        icon: showJobs ? 'visibility_off' : 'visibility',
        onClick: () => {
          setShowJobs((prev) => !prev);
        },
        separator: true,
      }
    );
    if (enabledActions.advanced) {
      result.push({
        label: 'Details',
        icon: 'manage_search',
        onClick: () => {
          setDetailsVisible(true);
        },
      });
    }
    result.push(...scopedEndpoints, ...linkOptions);
    return result;
  }, [
    scopedEndpoints,
    linkOptions,
    assetData.id,
    sendTo,
    showJobs,
    setShowJobs,
    enabledActions.upload,
    enabledActions.spreadsheetIngest,
    enabledActions.advanced,
    isUploading,
    spreadsheetIngest,
  ]);

  return (
    <Navbar>
      {contextActionResult && (
        <ContextActionResult
          mime={contextActionResult.contentType}
          payload={contextActionResult.payload}
          onHide={() => {
            setContextActionResult(null);
          }}
        />
      )}

      {detailsVisible && (
        <Dialog
          style={{ height: '80%', width: '80%' }}
          onHide={() => {
            setDetailsVisible(false);
          }}
        >
          <MetadataDetail assetData={assetData} />
        </Dialog>
      )}

      {uploadVisible && (
        <MediaUploadDialog
          id={assetData.id}
          title={assetData.title as string}
          contentType={assetData.content_type}
          onHide={() => {
            setUploadVisible(false);
          }}
        />
      )}

      <Button
        icon="add"
        onClick={onNewAsset}
        label="New"
        tooltip="Create a new asset"
        disabled={!enabledActions.create}
      />
      <Button
        icon="content_copy"
        onClick={onCloneAsset}
        label="Clone"
        tooltip="Clone this asset"
        disabled={!enabledActions.clone}
      />

      <Dropdown
        options={assetActions}
        disabled={!enabledActions.actions}
        icon="more_vert"
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
