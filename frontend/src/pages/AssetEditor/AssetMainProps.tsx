import contentType from 'content-type';
import React, { useState, useMemo } from 'react';

import AssigneesButton from './AssigneesButton';
import ContextActionResult from './ContextAction';
import MetadataDetail from './MetadataDetail';

import {
  Navbar,
  Button,
  Spacer,
  Dropdown,
  ToolbarSeparator,
  InputTimecode,
  Dialog,
} from '@/components';
import type { DropdownOptionProps } from '@/components/Dropdown';
import { useDialog } from '@/features/Dialogs';
import { UploadButton } from '@/features/MediaUpload';
import { useNebula } from '@/features/Nebula';
import nebula from '@/nebula';

interface AssetMainPropsProps {
  assetData: Record<string, any>;
  setMeta: (key: string, value: any, instant?: boolean) => void;
  enabledActions: {
    folderChange: boolean;
    edit: boolean;
    advanced: boolean;
    actions: boolean;
    upload: boolean;
  };
}

const AssetMainProps: React.FC<AssetMainPropsProps> = ({
  assetData,
  setMeta,
  enabledActions,
}) => {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [contextActionResult, setContextActionResult] = useState<{
    contentType: string;
    payload: any;
  } | null>(null);
  const showDialog = useDialog();
  const { setCurrentView, setSearchQuery } = useNebula();

  const currentFolder = useMemo(() => {
    if (!nebula.settings?.folders) return null;
    return nebula.settings.folders.find((f) => f.id === assetData?.id_folder) || null;
  }, [assetData?.id_folder]);

  const folderOptions = useMemo((): DropdownOptionProps[] => {
    return (nebula.getWritableFolders() || []).map((f) => ({
      label: f.name,
      style: { borderLeft: `4px solid ${f.color}` },
      onClick: () => {
        setMeta('id_folder', f.id);
      },
      value: f.id,
    }));
  }, [setMeta]);

  // Actions

  const scopedEndpoints = useMemo((): DropdownOptionProps[] => {
    const result: DropdownOptionProps[] = [];
    const endpoints = nebula.getScopedEndpoints('asset');
    for (const endpoint of endpoints) {
      result.push({
        label: endpoint.title,
        onClick: () => {
          nebula
            .request(endpoint.endpoint, { id_asset: assetData.id })
            .then((response) => {
              const ct = response.headers['content-type'] as string;
              setContextActionResult({
                contentType: ct ? contentType.parse(ct).type : 'application/json',
                payload: response.data,
              });
            });
        },
      });
    }
    return result;
  }, [assetData.id]);

  const linkOptions = useMemo((): DropdownOptionProps[] => {
    if (!currentFolder?.links) return [];

    return currentFolder.links.map((l: any) => ({
      label: l.name,
      disabled: !assetData[l.source_key],
      onClick: () => {
        const query = `${l.target_key}:${assetData[l.source_key]}`;
        setCurrentView(l.view);
        setSearchQuery(query);
      },
    }));
  }, [assetData, currentFolder, setCurrentView, setSearchQuery]);

  const sendTo = () => {
    showDialog('sendto', 'Send to...', { assets: [assetData.id] })
      .then(() => {})
      .catch(() => {});
  };

  const assetActions = useMemo((): DropdownOptionProps[] => {
    const result: DropdownOptionProps[] = [
      {
        label: 'Send to...',
        onClick: () => {
          sendTo();
        },
      },
      ...scopedEndpoints,
      ...linkOptions,
    ];
    if (result.length > 1) {
      result[1].separator = true;
    }
    return result;
  }, [scopedEndpoints, linkOptions, assetData.id]);

  // End actions

  const fps = useMemo(() => {
    if (!assetData) return 25;
    return (assetData['video/fps_f'] as number) || 25;
  }, [assetData['video/fps_f']]);

  return (
    <Navbar>
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

      {contextActionResult && (
        <ContextActionResult
          mime={contextActionResult.contentType}
          payload={contextActionResult.payload}
          onHide={() => {
            setContextActionResult(null);
          }}
        />
      )}

      <Dropdown
        options={folderOptions}
        buttonStyle={{
          borderLeft: ` 4px solid ${currentFolder?.color || 'transparent'}`,
          minWidth: 130,
          width: 130,
        }}
        label={currentFolder?.name || 'no folder'}
        disabled={!enabledActions.folderChange}
        value={currentFolder?.id}
      />

      <InputTimecode
        value={(assetData?.duration as number) || 0}
        fps={fps}
        onChange={(val) => {
          setMeta('duration', val);
        }}
        tooltip="Asset duration"
        readOnly={!!assetData.status || !enabledActions.edit}
      />

      <ToolbarSeparator />

      {enabledActions.advanced && (
        <AssigneesButton
          assignees={(assetData?.assignees as number[]) || []}
          setAssignees={(val) => {
            setMeta('assignees', val);
          }}
        />
      )}

      <Spacer />

      {enabledActions.advanced && (
        <>
          <Dropdown
            options={assetActions}
            disabled={!enabledActions.actions}
            label="Actions"
          />
          <Button
            icon="manage_search"
            label="Details"
            onClick={() => {
              setDetailsVisible(true);
            }}
          />
        </>
      )}

      {nebula.settings?.system?.ui_asset_upload && (
        <UploadButton
          id={assetData.id}
          title={assetData.title as string}
          contentType={assetData.content_type}
          disabled={!enabledActions.upload}
        />
      )}
    </Navbar>
  );
};

export default AssetMainProps;
