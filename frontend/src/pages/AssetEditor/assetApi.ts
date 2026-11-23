import { isEmpty } from 'lodash';

import type { ActivityPage, MetaActivity } from '@/client';
import nebula from '@/nebula';

// Asset metadata as the editor holds it: meta keys, plus the computed
// fields the detail endpoint returns (`has_aired`, `__aux`)
export type AssetRecord = Record<string, any>;

// Changed aux documents, by key. They are saved separately from metadata.
export type AuxChanges = Record<string, unknown>;

export const fetchAsset = async (id: number): Promise<AssetRecord> => {
  const response = await nebula.assetsGet({
    path: { asset_id: id },
    throwOnError: true,
  });
  return response.data;
};

// Save the editor's changes and resolve with the asset id.
// Metadata goes first (create, or patch of the changed keys), then each
// changed aux document. New assets can't have aux changes yet: aux data is
// edited in the preview, which needs a saved asset.
export const saveAsset = async (
  id: number | undefined,
  changes: AssetRecord,
  auxChanges: AuxChanges
): Promise<number> => {
  let assetId = id;
  if (assetId === undefined) {
    const response = await nebula.assetsCreate({ body: changes, throwOnError: true });
    assetId = response.data.id;
  } else if (!isEmpty(changes)) {
    await nebula.assetsUpdate({
      path: { asset_id: assetId },
      body: changes,
      throwOnError: true,
    });
  }
  for (const [key, data] of Object.entries(auxChanges)) {
    await nebula.assetsAuxPut({
      path: { asset_id: assetId, key },
      body: data,
      throwOnError: true,
    });
  }
  return assetId;
};

// Activity feed (spec 010)

export type Activity = ActivityPage['items'][number];

export const fetchActivities = async (
  assetId: number,
  kind: string | undefined,
  cursor: string | undefined
): Promise<ActivityPage> => {
  const response = await nebula.assetsActivitiesList({
    path: { asset_id: assetId },
    query: { kind, cursor, limit: 50 },
    throwOnError: true,
  });
  return response.data;
};

export const fetchActivity = async (
  assetId: number,
  activityId: number
): Promise<Activity> => {
  const response = await nebula.assetsActivitiesGet({
    path: { asset_id: assetId, activity_id: activityId },
    throwOnError: true,
  });
  return response.data;
};

export const fetchActivityDetail = async (
  assetId: number,
  activityId: number
): Promise<MetaActivity['detail']> => {
  const activity = await fetchActivity(assetId, activityId);
  return activity.kind === 'meta' ? activity.detail : null;
};

export const addComment = async (assetId: number, text: string) => {
  await nebula.assetsActivitiesComment({
    path: { asset_id: assetId },
    body: { text },
    throwOnError: true,
  });
};

export const editComment = async (
  assetId: number,
  activityId: number,
  text: string
) => {
  await nebula.assetsActivitiesEdit({
    path: { asset_id: assetId, activity_id: activityId },
    body: { text },
    throwOnError: true,
  });
};

export const deleteComment = async (assetId: number, activityId: number) => {
  await nebula.assetsActivitiesDelete({
    path: { asset_id: assetId, activity_id: activityId },
    throwOnError: true,
  });
};
