import { Loader, Section } from '@components';
import { TableDraggableItem } from '@components/table/types';
import MetadataEditor from '@containers/MetadataEditor';
import { useDialog } from '@features/Dialogs';
import { JobsTable } from '@features/JobsTable';
import { useNebula } from '@features/Nebula';
import { useWebSocket } from '@features/Websocket';
import { useLocalStorage } from '@lib/useLocalStorage';
import clsx from 'clsx';
import { isEqual, isEmpty } from 'lodash';
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'react-toastify';

import AssetMainProps from './AssetMainProps';
import { AssetPreview } from './AssetPreview';
import AssetEditorNav from './EditorNav';

import nebula from '@/nebula';
import { AxiosError } from 'axios';

interface EnabledActions {
  save: boolean;
  edit: boolean;
  revert: boolean;
  folderChange: boolean;
  create: boolean;
  clone: boolean;
  actions: boolean;
  flag: boolean;
  upload: boolean;
  advanced: boolean;
}

const getEnabledActions = ({
  assetData,
  isChanged,
}: {
  assetData: Record<string, any>;
  isChanged: boolean;
}): Partial<EnabledActions> => {
  // Return an object with all the actions that are enabled
  // for the current asset and the current user
  // This is used to enable/disable buttons in the UI

  if (!assetData) return {};

  const limited = nebula.user?.is_limited;
  const writableFolders = nebula.getWritableFolders();
  const writableFolderIds = writableFolders.map((f) => f.id);

  const edit = !(limited && assetData['qc/state'] === 4);
  const save = isChanged && edit;
  const revert = isChanged;

  // it does not make sense to click add, when the current asset is brand new
  // (id_folder is always present)
  const create = writableFolders.length > 0 && Object.keys(assetData).length > 1;
  const clone = !!(
    assetData.id &&
    assetData.id_folder &&
    writableFolderIds.includes(assetData.id_folder as number)
  );

  const folderChange = !assetData.id && edit;
  const flag = !!(assetData.id && !nebula.user?.is_limited);
  const upload = !!(assetData.id && edit);
  const actions = !!assetData?.id;
  const advanced = !limited;

  return {
    save,
    edit,
    revert,
    folderChange,
    create,
    clone,
    actions,
    flag,
    upload,
    advanced,
  };
};

interface AssetEditorProps {
  draggedObjects?: TableDraggableItem[] | null;
}

const AssetEditor: React.FC<AssetEditorProps> = () => {
  const {
    focusedAsset,
    setPageTitle,
    reloadBrowser,
    setSelectedAssets,
    setFocusedAsset,
  } = useNebula();
  const [assetData, setAssetData] = useState<Record<string, any>>({});
  const [originalData, setOriginalData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [editorMode, setEditorMode] = useLocalStorage<'metadata' | 'preview'>(
    'mam.editor.mode',
    'metadata'
  );
  const [showJobs, setShowJobs] = useLocalStorage<boolean>('mam.editor.showJobs', true);
  const [, setSearchParams] = useSearchParams();

  const assetIdRef = useRef<number | string | null>(focusedAsset);
  const changedKeysRef = useRef(new Set([] as string[]));

  const showDialog = useDialog();
  const ws = useWebSocket();

  // Load asset data

  const loadAsset = useCallback(
    (id_asset: number | string) => {
      setLoading(true);
      nebula
        .get({
          body: { object_type: 'asset', ids: [Number(id_asset)] },
          throwOnError: true,
        })
        .then((response) => {
          const data = response.data.data?.[0] || {};
          setAssetData(data);
          setOriginalData(data);
          assetIdRef.current = id_asset;
          changedKeysRef.current = new Set();
          setSearchParams((o) => {
            o.set('asset', id_asset.toString());
            return o;
          });
        })
        .catch((error) => {
          toast.error(
            <>
              <strong>Unable to load asset</strong>
              <p>{error.response?.data?.detail || 'Unknown error'}</p>
            </>
          );
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [setSearchParams]
  );

  const refetchUnchangedFields = useCallback(() => {
    if (!assetIdRef.current) return;
    console.log('Refetching unchanged fields for asset', assetIdRef.current);
    const changedKeys = changedKeysRef.current;
    setLoading(true);
    nebula
      .get({
        body: { object_type: 'asset', ids: [Number(assetIdRef.current)] },
        throwOnError: true,
      })
      .then((response) => {
        const freshData = response.data.data?.[0] || {};

        setAssetData((oldFormData) => {
          const newFormData = { ...oldFormData };
          const allKeys = new Set([
            ...Object.keys(oldFormData),
            ...Object.keys(freshData),
          ]);

          for (const key of allKeys) {
            if (changedKeys.has(key)) continue;
            if (isEqual(oldFormData[key], freshData[key])) continue;
            newFormData[key] = freshData[key];
          }
          return newFormData;
        });

        setOriginalData(freshData);
      })
      .catch((error: unknown) => {
        if (!(error instanceof AxiosError)) return;
        toast.error(
          <>
            <strong>Unable to refresh asset</strong>
            <p>{error.response?.data?.detail || 'Unknown error'}</p>
          </>
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Update a single asset meta field
  // (called by EditorForm, flag buttons, etc.)

  const setMeta = (key: string, value: any, instant?: boolean) => {
    if (key === 'id_folder' && isEmpty(assetData)) {
      setOriginalData({ id_folder: value });
    }
    if (instant) {
      onSave({ [key]: value });
    } else {
      setAssetData((o) => {
        return { ...o, [key]: value };
      });
    }
  };

  // Which keys have been changed by the user
  // (compared to the data we loaded from the server).
  // Unset values are normalized to null, so clearing a field
  // is a change, but setting it to 0 or an empty string is a change too.

  const changedKeys = useMemo(() => {
    const result = new Set<string>();
    const allKeys = new Set([...Object.keys(assetData), ...Object.keys(originalData)]);
    for (const key of allKeys) {
      if (key === 'id') continue;
      if (isEqual(assetData[key] ?? null, originalData[key] ?? null)) continue;
      result.add(key);
    }
    return result;
  }, [assetData, originalData]);

  // Keep a ref of the changed keys, so the websocket handler
  // doesn't overwrite them when refetching unchanged fields

  useEffect(() => {
    // don't update changed keys while loading
    if (loading) return;
    changedKeysRef.current = changedKeys;
  }, [changedKeys, loading]);

  // Data of the set request.
  // For existing assets, only the fields the user has changed are sent,
  // for new ones everything we have.
  // Cleared fields are sent as null, which unsets them server-side.

  const savePayload = useMemo(() => {
    const keys = assetData.id ? changedKeys : new Set(Object.keys(assetData));
    const result: Record<string, any> = {};
    for (const key of keys) {
      if (key === 'id') continue;
      result[key] = assetData[key] ?? null;
    }
    return result;
  }, [changedKeys, assetData]);

  // If the asset is new, set the default folder
  // (first writable folder)

  useEffect(() => {
    if (assetData?.id_folder) return;
    const folders = nebula.getWritableFolders();
    if (folders.length > 0) {
      setMeta('id_folder', folders[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetData?.id_folder]);

  // Parse and show asset data

  useEffect(() => {
    if (assetData.id) {
      let title = `${assetData.title || 'Untitled asset'}`;
      if (assetData.subtitle) {
        const separator = nebula.settings?.system?.subtitle_separator || ' - ';
        title = `${title}${separator}${assetData.subtitle}`;
      }
      setPageTitle(title);
    } else {
      const folderName = assetData.id_folder
        ? nebula.getFolderName(assetData.id_folder as number)?.toLowerCase()
        : 'asset';
      setPageTitle(folderName || 'asset', 'fiber_new');
    }
  }, [
    assetData?.id,
    assetData?.id_folder,
    setPageTitle,
    assetData.title,
    assetData.subtitle,
  ]);

  // Which fields are visible in the editor

  const fields = useMemo(() => {
    if (!assetData?.id_folder || !nebula.settings?.folders) return [];
    return (
      nebula.settings.folders.find((f) => f.id === assetData.id_folder)?.fields || []
    );
  }, [assetData]);

  // Which fields are editable
  // (this is used to determine if there are unsaved changes)
  // Contains both standard and folder-specific fields

  const editableFieldNames = useMemo(() => {
    const editableFieldNames = [
      'qc/state',
      'id_folder',
      'duration',
      'mark_in',
      'mark_out',
      'subclips',
      'poster_frame',
      'assignees',
      '__aux/nebula:transcription',
    ];
    for (const field of fields) {
      editableFieldNames.push(field.name);
    }

    return editableFieldNames;
  }, [fields]);

  // Are there unsaved changes that can be saved?
  // This returns true only if a field that is editable has changed

  const isChanged = useMemo(
    () => editableFieldNames.some((key) => changedKeys.has(key)),
    [changedKeys, editableFieldNames]
  );

  // Which actions are enabled (save, revert, etc.)
  // This is used to disable buttons when there are no changes
  // as well as disable the handlers (since save may be called using a shortcut)

  const enabledActions = useMemo(() => {
    return getEnabledActions({ assetData, isChanged });
  }, [assetData, isChanged]);

  // When another asset is selected,
  // check if there are unsaved changes and ask to save them

  const switchAsset = useCallback(() => {
    if (!focusedAsset) return;
    if (isChanged) {
      const message = 'There are unsaved changes. Do you want to save them?';
      const cancelLabel = 'Discard';
      const confirmLabel = 'Save';

      showDialog('confirm', 'Unsaved changes', {
        message,
        cancelLabel,
        confirmLabel,
      })
        .then(() => {
          nebula
            .set({ body: { id: assetData.id, data: savePayload }, throwOnError: true })
            .then((res) => {
              // reload browser if it's a new asset
              // (if it already exists, it will be updated over ws,
              // but new assets won't be displayed until the browser is reloaded)
              if (!assetData.id) {
                const newId = res.data.id;
                setFocusedAsset(newId ?? null);
                reloadBrowser();
              }
            })
            .catch((error: unknown) => {
              if (!(error instanceof AxiosError)) return;
              toast.error(
                <>
                  <strong>Unable to save asset</strong>
                  <p>{error.response?.data?.detail || 'Unknown error'}</p>
                </>
              );
            })
            .finally(() => {
              loadAsset(focusedAsset);
            });
        })
        .catch(() => {
          loadAsset(focusedAsset);
        });
    } else {
      // asset unchanged
      loadAsset(focusedAsset);
    }
  }, [
    isChanged,
    assetData,
    savePayload,
    focusedAsset,
    loadAsset,
    reloadBrowser,
    setFocusedAsset,
    showDialog,
  ]);

  useEffect(() => {
    if (!focusedAsset) return;
    switchAsset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedAsset]);

  // Actions

  const onNewAsset = () => {
    const currentFolder = assetData.id_folder;
    setEditorMode('metadata');
    setSelectedAssets([]);
    setFocusedAsset(null);
    if (
      nebula
        .getWritableFolders()
        .map((f) => f.id)
        .includes(currentFolder as number)
    ) {
      setAssetData({ id_folder: currentFolder });
      setOriginalData({ id_folder: currentFolder });
    } else {
      setAssetData({});
      setOriginalData({});
    }
  };

  const onCloneAsset = () => {
    const ndata: Record<string, any> = {};
    setEditorMode('metadata');
    for (const field in assetData) {
      if (
        nebula.metaType(field).ns === 'm' ||
        ['duration', 'id_folder'].includes(field)
      )
        ndata[field] = assetData[field];
    }
    setSelectedAssets([]);
    setFocusedAsset(null);
    setAssetData(ndata);
    // the clone is a brand new object, so everything we have is a change
    setOriginalData({});
  };

  const onRevert = () => {
    if (!enabledActions.revert) return;
    setAssetData(originalData);
  };

  const onSave = useCallback(
    (payload?: Record<string, any>) => {
      if (!enabledActions.save && !payload) {
        return;
      }
      setLoading(true);
      nebula
        .set({
          body: { id: assetData.id, data: payload || savePayload },
          throwOnError: true,
        })
        .then((res) => {
          //reload browser if it's a new asset
          if (!assetData.id) {
            const newId = res.data.id;
            if (newId != null) loadAsset(newId);
            reloadBrowser();
          }
          // if asset already exists, we wait for the ws message to update the data
          // Just wait for ws message to update the asset data
        })
        .catch((error) => {
          setLoading(false);
          toast.error(
            <div>
              <strong>Unable to save asset</strong>
              <p>{error.response?.data?.detail || 'Unknown error'}</p>
            </div>
          );
        });
      // we don't clear the loading state here,
      // we wait for the ws message that confirms the asset has been updated
    },
    [assetData.id, savePayload, enabledActions.save, loadAsset, reloadBrowser]
  );

  // Keyboard shortcuts

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        onSave();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSave]);

  useEffect(() => {
    const handlePubSub = (topic: string, message: any) => {
      if (topic !== 'objects_changed') return;
      if (message.object_type !== 'asset') return;
      if (!assetIdRef.current) return;
      if (message.objects.includes(assetIdRef.current)) {
        refetchUnchangedFields();
      }
    };

    const unsubscribe = ws.subscribe('objects_changed', handlePubSub);
    return () => {
      unsubscribe();
    };
  }, [ws, refetchUnchangedFields]);

  //
  // Render
  //

  const mainComponent = () => {
    switch (editorMode) {
      case 'preview':
        return (
          <div className="grow row">
            <AssetPreview assetData={assetData} setAssetData={setAssetData} />
          </div>
        );

      default:
        return (
          <main className="grow column">
            <AssetMainProps
              assetData={assetData}
              setMeta={setMeta}
              enabledActions={enabledActions as EnabledActions}
            />
            <Section
              className={clsx('grow', 'column', {
                'section-changed': isChanged,
              })}
              style={{ minWidth: 500 }}
            >
              <div className="contained" style={{ overflowY: 'scroll', padding: 10 }}>
                {loading && (
                  <div className="contained center">
                    <Loader />
                  </div>
                )}
                <MetadataEditor
                  onSave={onSave}
                  originalData={originalData}
                  objectData={assetData}
                  setObjectData={setAssetData}
                  fields={fields}
                  disabled={!enabledActions.edit}
                />
              </div>
            </Section>
          </main>
        );
    }
  };

  return (
    <div className="grow column">
      <AssetEditorNav
        assetData={assetData}
        onNewAsset={onNewAsset}
        onCloneAsset={onCloneAsset}
        onRevert={onRevert}
        onSave={onSave}
        setMeta={setMeta}
        editorMode={editorMode}
        setEditorMode={setEditorMode}
        enabledActions={enabledActions as EnabledActions}
        showJobs={showJobs}
        setShowJobs={setShowJobs}
      />
      {Object.keys(assetData || {}).length > 0 && (
        <>
          {mainComponent()}
          {assetData?.id && showJobs && (
            <Section
              style={{
                minHeight: 120,
                position: 'relative',
              }}
            >
              <JobsTable assetId={assetData.id} className="contained" />
            </Section>
          )}
        </>
      )}
    </div>
  );
};

export default AssetEditor;
