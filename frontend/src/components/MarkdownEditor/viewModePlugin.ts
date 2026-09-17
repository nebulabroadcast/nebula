import { realmPlugin, viewMode$ } from '@mdxeditor/editor';
import type { ViewMode } from '@mdxeditor/editor';

// diffSourcePlugin only reads its viewMode parameter when the editor is
// mounted, and the built-in way to change it later is its own toolbar
// toggle. This lets us drive the view mode from a prop instead, so the
// switch can live outside the editor.

export const viewModePlugin = realmPlugin<{ viewMode: ViewMode }>({
  init(realm, params) {
    realm.pub(viewMode$, params?.viewMode ?? 'rich-text');
  },
  update(realm, params) {
    const viewMode = params?.viewMode ?? 'rich-text';
    // publishing the same mode again would re-apply the source editor
    // value to the rich text editor on every render
    if (realm.getValue(viewMode$) === viewMode) return;
    realm.pub(viewMode$, viewMode);
  },
});
