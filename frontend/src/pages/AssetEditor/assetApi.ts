import { isEmpty } from 'lodash';

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
