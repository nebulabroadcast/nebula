import nebula from '/src/nebula';

import { useDispatch } from 'react-redux';
import { useState, useMemo } from 'react';
import { setCurrentViewId, setSearchQuery } from '/src/actions';

import {
  Navbar,
  Button,
  Spacer,
  Dropdown,
  ToolbarSeparator,
  InputTimecode,
  Dialog,
} from '/src/components';

import { UploadButton } from '/src/containers/Upload';
import { useDialog } from '/src/hooks';

import MetadataDetail from './MetadataDetail';
import ContextActionResult from './ContextAction';
import AssigneesButton from './AssigneesButton';

import contentType from 'content-type';

const AssetEditorNav = ({ assetData, setMeta, enabledActions }) => {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [contextActionResult, setContextActionResult] = useState(null);
  const dispatch = useDispatch();
  const showDialog = useDialog();

  const currentFolder = useMemo(() => {
    if (!nebula.settings.folders) return null;
    for (const f of nebula.settings.folders) {
      if (f.id !== assetData?.id_folder) continue;
      return f;
    }
  }, [{ ...assetData }]);

  const folderOptions = useMemo(() => {
    return nebula.getWritableFolders().map((f) => ({
      label: f.name,
      style: { borderLeft: `4px solid ${f.color}` },
      onClick: () => setMeta('id_folder', f.id),
    }));
  }, []);

  // Actions

  const scopedEndpoints = useMemo(() => {
    const result = [];
    for (const scopedEndpoints of nebula.getScopedEndpoints('asset')) {
      result.push({
        label: scopedEndpoints.title,
        onClick: () => {
          nebula
            .request(scopedEndpoints.endpoint, { id_asset: assetData.id })
            .then((response) => {
              setContextActionResult({
                contentType: contentType.parse(response.headers['content-type']).type,
                payload: response.data,
              });
            });
        },
      });
    }
    return result;
  }, [assetData.id]);

  const linkOptions = useMemo(() => {
    if (!currentFolder) return [];

    return currentFolder.links.map((l) => ({
      label: l.name,
      disabled: !assetData[l['source_key']],
      onClick: () => {
        const query = `${l['target_key']}:${assetData[l['source_key']]}`;
        dispatch(setCurrentViewId(l.view));
        dispatch(setSearchQuery(query));
      },
    }));
  }, [assetData.id]); // dependency could be currentFolder, but only if assetData is a ref

  const sendTo = () => {
    showDialog('sendto', 'Send to...', { assets: [assetData.id] })
      .then(() => {})
      .catch(() => {});
  };

  const assetActions = useMemo(() => {
    const result = [
      {
        label: 'Send to...',
        onClick: () => sendTo(),
      },
      ...scopedEndpoints,
      ...linkOptions,
    ];
    if (result.length > 1) {
      result[1].separator = true;
    }
    return result;
  }, [scopedEndpoints, linkOptions]);

  // End actions

  const fps = useMemo(() => {
    if (!assetData) return 25;
    return assetData['video/fps_f'] || 25;
  }, [assetData['video/fps_f']]);

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
        tooltip="Asset duration"
        readOnly={assetData.status || !enabledActions.edit}
      />

      <ToolbarSeparator />

      {enabledActions.advanced && (
        <AssigneesButton
          assignees={assetData?.assignees || []}
          setAssignees={(val) => setMeta('assignees', val)}
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
            onClick={() => setDetailsVisible(true)}
          />
        </>
      )}

      {nebula.settings?.system?.ui_asset_upload && (
        <UploadButton assetData={assetData} disabled={!enabledActions.upload} />
      )}
    </Navbar>
  );
};

export default AssetEditorNav;
