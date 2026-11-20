import { Dropdown, TextArea } from '@components';
import { useDialog } from '@features/Dialogs';
import { getFormatter } from '@lib/format';
import { formatTimeString, getErrorDetail } from '@lib/utils';
import { useState } from 'react';
import { toast } from 'react-toastify';
import styled from 'styled-components';

import {
  deleteComment,
  editComment,
  fetchActivityDetail,
  type Activity,
} from '../assetApi';

import { ObjectStatus, type ChangedDetail } from '@/client';
import nebula from '@/nebula';

const QC_LABELS = ['new', 'auto rejected', 'auto accepted', 'rejected', 'accepted'];

const ItemWrapper = styled.div`
  padding: 8px 10px;
  border-bottom: 1px solid var(--color-surface-03);
  display: flex;
  flex-direction: column;
  gap: 4px;

  .header {
    display: flex;
    gap: 8px;
    align-items: center;
    color: var(--color-text-dim);
    font-size: 0.85em;
  }

  .menu {
    margin: -6px 0 -6px auto;

    button {
      height: 20px;
      min-width: 20px;
      padding: 0;
      background: none;
    }
  }

  .hint {
    font-size: 0.8em;
  }

  .author {
    color: var(--color-text);
    font-weight: bold;
  }

  .line {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
  }

  .comment {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .muted {
    color: var(--color-text-dim);
    font-style: italic;
  }

  .link {
    cursor: pointer;
    text-decoration: underline dotted;
  }
`;

const DiffTable = styled.div`
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 2px 8px;
  font-size: 0.9em;

  .key {
    color: var(--color-text-dim);
  }

  .value {
    min-width: 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }

  .value.clamped {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .old {
    text-decoration: line-through;
    color: var(--color-text-dim);
  }
`;

const authorName = (id_user: number | null) => {
  if (id_user === null) return 'System';
  const user = nebula.settings?.users?.find((u) => u.id === id_user);
  return user?.full_name || user?.name || `User ${id_user}`;
};

const timeAgo = (timestamp: number) => {
  const seconds = Math.round(timestamp - Date.now() / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const rtf = new Intl.RelativeTimeFormat(nebula.locale, { numeric: 'auto' });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return 'just now';
};

const formatSize = (bytes: number) => {
  const units = ['B', 'kB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1000 && unit < units.length - 1) {
    size /= 1000;
    unit++;
  }
  return `${size.toFixed(unit ? 1 : 0)} ${units[unit]}`;
};

// A value as the browser table shows it; values the table can't show
// (objects such as subclips) as JSON
const formatValue = (key: string, value: unknown): React.ReactNode => {
  if (value === null || value === undefined) return <span className="muted">none</span>;
  const isPlain =
    typeof value !== 'object' ||
    (Array.isArray(value) && value.every((v) => typeof v !== 'object'));
  if (!isPlain) return JSON.stringify(value, null, 1);
  return getFormatter(key)({ [key]: value }, key);
};

const DiffValue = ({ children }: { children: React.ReactNode }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={expanded ? 'value' : 'value clamped'}
      title={expanded ? undefined : 'Click to show all'}
      onClick={() => {
        setExpanded(true);
      }}
    >
      {children}
    </div>
  );
};

const ChangedBody = ({
  assetId,
  activityId,
  keys,
}: {
  assetId: number;
  activityId: number;
  keys: string[];
}) => {
  const [detail, setDetail] = useState<ChangedDetail | null | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const toggle = () => {
    setOpen((o) => !o);
    if (detail !== undefined) return;
    fetchActivityDetail(assetId, activityId)
      .then((d) => {
        setDetail(d ?? null);
      })
      .catch((error: unknown) => {
        toast.error(getErrorDetail(error));
      });
  };

  return (
    <>
      <div className="line">
        changed
        <span className="link" onClick={toggle}>
          {keys.map((key) => nebula.metaType(key).title || key).join(', ')}
        </span>
      </div>
      {open && detail && (
        <DiffTable>
          {Object.entries(detail.changes).map(([key, [oldValue, newValue]]) => (
            <div key={key} style={{ display: 'contents' }}>
              <span className="key">{nebula.metaType(key).title || key}</span>
              <div>
                <DiffValue>
                  <span className="old">{formatValue(key, oldValue)}</span>
                </DiffValue>
                <DiffValue>{formatValue(key, newValue)}</DiffValue>
              </div>
            </div>
          ))}
        </DiffTable>
      )}
    </>
  );
};

const statusLine = (
  old: number | null | undefined,
  status: number | null | undefined
) => {
  if (status === ObjectStatus.TRASHED) return 'moved the asset to trash';
  if (status === ObjectStatus.ARCHIVED) return 'archived the asset';
  if (old === ObjectStatus.TRASHED || old === ObjectStatus.ARCHIVED)
    return 'restored the asset';
  return <>changed status to {formatValue('status', status)}</>;
};

const useCommentActions = (
  activity: Extract<Activity, { kind: 'comment' }>,
  assetId: number
) => {
  const showDialog = useDialog();
  const isOwn = activity.id_user === nebula.user?.id;

  const save = (text: string, done: () => void) => {
    if (!text.trim()) return;
    editComment(assetId, activity.id, text)
      .then(done)
      .catch((error: unknown) => {
        toast.error(getErrorDetail(error));
      });
  };

  const remove = () => {
    showDialog('confirm', 'Delete comment', {
      message: 'Do you want to delete this comment?',
      confirmLabel: 'Delete',
    }).then(
      () => {
        deleteComment(assetId, activity.id).catch((error: unknown) => {
          toast.error(getErrorDetail(error));
        });
      },
      () => {
        // cancelled
      }
    );
  };

  return {
    canEdit: isOwn && !activity.summary.deleted,
    canDelete: (isOwn || !!nebula.user?.is_admin) && !activity.summary.deleted,
    save,
    remove,
  };
};

const CommentBody = ({
  activity,
  editing,
  setEditing,
  onSave,
}: {
  activity: Extract<Activity, { kind: 'comment' }>;
  editing: string | null;
  setEditing: (text: string | null) => void;
  onSave: (text: string) => void;
}) => {
  const { text, edited, deleted } = activity.summary;

  if (deleted) return <div className="muted">comment deleted</div>;

  if (editing !== null) {
    return (
      <>
        <TextArea
          value={editing}
          onChange={setEditing}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSave(editing);
            }
            if (e.key === 'Escape') setEditing(null);
          }}
          autoFocus
          style={{ height: 56, minHeight: 56, minWidth: 0 }}
        />
        <div className="muted hint">Enter to save, Esc to cancel</div>
      </>
    );
  }

  return (
    <div className="comment">
      {text}
      {edited && (
        <span className="muted" title={formatTimeString(edited)}>
          {' '}
          (edited)
        </span>
      )}
    </div>
  );
};

const ActivityBody = ({
  activity,
  assetId,
}: {
  activity: Activity;
  assetId: number;
}) => {
  switch (activity.kind) {
    case 'created':
      return <div className="line">created the asset</div>;
    case 'changed':
      return (
        <ChangedBody
          assetId={assetId}
          activityId={activity.id}
          keys={activity.summary.keys}
        />
      );
    case 'qc':
      return (
        <div className="line">
          {activity.summary.new === null || activity.summary.new === undefined ? (
            'cleared QC'
          ) : (
            <>
              set QC to {formatValue('qc/state', activity.summary.new)}
              <strong>{QC_LABELS[activity.summary.new]}</strong>
            </>
          )}
          {activity.summary.old !== null && activity.summary.old !== undefined && (
            <span className="muted">(was {QC_LABELS[activity.summary.old]})</span>
          )}
        </div>
      );
    case 'status':
      return (
        <div className="line">
          {statusLine(activity.summary.old, activity.summary.new)}
        </div>
      );
    case 'uploaded':
      return (
        <div className="line">
          uploaded a file ({formatSize(activity.summary.size)},{' '}
          {activity.summary.extension})
        </div>
      );
    case 'comment':
      // rendered by CommentItem
      return null;
    default:
      // a kind from a newer server
      return <div className="line muted">{(activity as { kind: string }).kind}</div>;
  }
};

const ItemHeader = ({
  activity,
  menu,
}: {
  activity: Activity;
  menu?: React.ReactNode;
}) => (
  <div className="header">
    <span className="author">{authorName(activity.id_user)}</span>
    <span title={formatTimeString(activity.ctime)}>{timeAgo(activity.ctime)}</span>
    {menu && <span className="menu">{menu}</span>}
  </div>
);

const CommentItem = ({
  activity,
  assetId,
}: {
  activity: Extract<Activity, { kind: 'comment' }>;
  assetId: number;
}) => {
  const [editing, setEditing] = useState<string | null>(null);
  const { canEdit, canDelete, save, remove } = useCommentActions(activity, assetId);

  const options = [
    ...(canEdit
      ? [
          {
            label: 'Edit',
            icon: 'edit',
            onClick: () => {
              setEditing(activity.summary.text ?? '');
            },
          },
        ]
      : []),
    ...(canDelete ? [{ label: 'Delete', icon: 'delete', onClick: remove }] : []),
  ];

  return (
    <ItemWrapper>
      <ItemHeader
        activity={activity}
        menu={
          options.length > 0 &&
          editing === null && (
            <Dropdown
              icon="more_vert"
              align="right"
              options={options}
              // upwards: the newest comments are at the bottom of the scrolled feed
              contentStyle={{ bottom: '100%' }}
            />
          )
        }
      />
      <CommentBody
        activity={activity}
        editing={editing}
        setEditing={setEditing}
        onSave={(text) => {
          save(text, () => {
            setEditing(null);
          });
        }}
      />
    </ItemWrapper>
  );
};

export const ActivityItem = ({
  activity,
  assetId,
}: {
  activity: Activity;
  assetId: number;
}) =>
  activity.kind === 'comment' ? (
    <CommentItem activity={activity} assetId={assetId} />
  ) : (
    <ItemWrapper>
      <ItemHeader activity={activity} />
      <ActivityBody activity={activity} assetId={assetId} />
    </ItemWrapper>
  );
