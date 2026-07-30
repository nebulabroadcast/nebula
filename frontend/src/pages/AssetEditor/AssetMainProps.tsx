import React, { useState, useMemo } from 'react';

import AssigneesButton from './AssigneesButton';
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
import { UploadButton } from '@/features/MediaUpload';
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

  const currentFolder = useMemo(() => {
    if (!nebula.settings?.folders) return null;
    return nebula.settings.folders.find((f) => f.id === assetData?.id_folder) || null;
  }, [assetData.id_folder]);

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

  const fps = useMemo(() => {
    if (!assetData) return 25;
    return (assetData['video/fps_f'] as number) || 25;
  }, [assetData]);

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
        <Button
          icon="manage_search"
          label="Details"
          onClick={() => {
            setDetailsVisible(true);
          }}
        />
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
