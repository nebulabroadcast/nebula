import React, { useMemo } from 'react';

import AssigneesButton from './AssigneesButton';
import type { EnabledActions } from './types';

import { Navbar, Dropdown, ToolbarSeparator, InputTimecode } from '@/components';
import type { DropdownOptionProps } from '@/components/Dropdown';
import nebula from '@/nebula';

interface AssetMainPropsProps {
  assetData: Record<string, any>;
  setMeta: (key: string, value: any, instant?: boolean) => void;
  enabledActions: EnabledActions;
}

const AssetMainProps: React.FC<AssetMainPropsProps> = ({
  assetData,
  setMeta,
  enabledActions,
}) => {
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

      {!nebula.user?.is_limited && (
        <AssigneesButton
          assignees={(assetData?.assignees as number[]) || []}
          setAssignees={(val) => {
            setMeta('assignees', val);
          }}
        />
      )}
    </Navbar>
  );
};

export default AssetMainProps;
