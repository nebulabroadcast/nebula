import { useDialog } from '@features/Dialogs';
import clsx from 'clsx';
import React, { useState } from 'react';

import { siteViewKey, tabChanged, userViewKey } from './query';
import type { BrowserView, TabSettings } from './types';
import { useBrowser } from './useBrowser';

import nebula from '@/nebula';

export const Icon = ({ name, className }: { name: string; className?: string }) => (
  <span className={clsx('icon material-symbols-outlined', className)} translate="no">
    {name}
  </span>
);

const NameInput = ({
  value,
  onDone,
}: {
  value: string;
  onDone: (name: string | null) => void;
}) => {
  const [name, setName] = useState(value);
  return (
    <div className="it">
      <input
        className="nb-input"
        autoFocus
        value={name}
        placeholder="View name"
        onChange={(event) => {
          setName(event.target.value);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') onDone(name.trim() || null);
          if (event.key === 'Escape') onDone(null);
        }}
      />
    </div>
  );
};

interface ViewListProps {
  tab: TabSettings;
  view: BrowserView;
  onClose: () => void;
}

// The site views and the user's own: pick one, save the tab as a new one,
// or save the changes into the user view it shows
const ViewList = ({ tab, view, onClose }: ViewListProps) => {
  const browser = useBrowser();
  const showDialog = useDialog();
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);

  const viewRow = (
    key: string,
    name: string,
    icon: string,
    actions?: React.ReactNode
  ) => (
    <button
      key={key}
      className={clsx('it', tab.view === key && 'current')}
      data-nav
      onClick={() => {
        browser.selectView(tab.id, key);
        onClose();
      }}
    >
      <Icon name={tab.view === key ? 'radio_button_checked' : icon} />
      <span className="grow">{name}</span>
      {actions}
    </button>
  );

  const userView = tab.view.startsWith('user:') && tabChanged(view, tab);

  return (
    <div className="views">
      <div className="hd">Views</div>
      {(nebula.settings?.views || []).map((v) => (
        <React.Fragment key={v.id}>
          {v.separator && <div className="divider" />}
          {viewRow(siteViewKey(v.id), v.name, 'folder_open')}
        </React.Fragment>
      ))}
      <div className="hd">My views</div>
      {browser.userViews.map((v) =>
        renaming === v.id ? (
          <NameInput
            key={v.id}
            value={v.name}
            onDone={(name) => {
              if (name) browser.renameUserView(v.id, name);
              setRenaming(null);
            }}
          />
        ) : (
          viewRow(
            userViewKey(v.id),
            v.name,
            'person',
            <span className="actions">
              <span
                title="Rename"
                onClick={(event) => {
                  event.stopPropagation();
                  setRenaming(v.id);
                }}
              >
                <Icon name="edit" className="remove" />
              </span>
              <span
                title="Delete"
                onClick={(event) => {
                  event.stopPropagation();
                  showDialog('confirm', 'Delete view', {
                    message: `Delete the view **${v.name}**?`,
                  })
                    .then(() => {
                      browser.deleteUserView(v.id);
                    })
                    .catch(() => {
                      // dialog dismissed, do nothing
                    });
                }}
              >
                <Icon name="delete" className="remove" />
              </span>
            </span>
          )
        )
      )}
      {userView && (
        <button
          className="it current"
          data-nav
          title="Save the filters, search, sort and columns into this view"
          onClick={() => {
            browser.updateUserView(tab.id);
          }}
        >
          <Icon name="save" />
          <span className="grow">Save changes to {view.name}</span>
        </button>
      )}
      {saving ? (
        <NameInput
          value=""
          onDone={(name) => {
            if (name) browser.saveUserView(tab.id, name);
            setSaving(false);
          }}
        />
      ) : (
        <button
          className="it"
          data-nav
          onClick={() => {
            setSaving(true);
          }}
        >
          <Icon name="bookmark_add" />
          <span className="grow">Save as new view...</span>
        </button>
      )}
    </div>
  );
};

export default ViewList;
