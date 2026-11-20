import { Dropdown, Icon, TextArea } from '@components';
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

import { ObjectStatus, type MetaDetail } from '@/client';
import nebula from '@/nebula';

type CommentActivity = Extract<Activity, { kind: 'comment' }>;

const QC_LABELS = ['new', 'auto rejected', 'auto accepted', 'rejected', 'accepted'];
const QC_COLORS = [
  undefined,
  'var(--color-red)',
  'var(--color-green)',
  'var(--color-red)',
  'var(--color-green)',
];

//
// Styles
//

// Events: one dim line with an icon
const EventRow = styled.div`
  display: flex;
  gap: 6px;
  align-items: flex-start;
  padding: 3px 10px;
  font-size: 0.85em;
  color: var(--color-text-dim);

  .icon {
    font-size: 16px;
    line-height: 18px;
  }

  .text {
    flex-grow: 1;
    min-width: 0;
    line-height: 18px;
  }

  .author {
    color: var(--color-text);
  }

  .time {
    flex-shrink: 0;
    line-height: 18px;
  }

  .link {
    cursor: pointer;
    text-decoration: underline dotted;
  }

  .deleted {
    font-style: italic;
  }
`;

// Comments: a lighter bubble
const Bubble = styled.div`
  margin: 6px 10px;
  padding: 6px 10px 8px;
  border-radius: 8px;
  background-color: var(--color-surface-03);

  &.own {
    background-color: var(--color-surface-04);
  }

  .header {
    display: flex;
    gap: 6px;
    align-items: center;
    height: 20px;
    margin-bottom: 4px;
    font-size: 0.85em;
    color: var(--color-text-dim);
  }

  .author {
    color: var(--color-text);
    font-weight: bold;
  }

  .avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }

  .avatar.initials {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    background-color: var(--color-surface-05);
    color: var(--color-text);
  }

  .menu {
    margin-left: auto;
    visibility: hidden;

    button {
      height: 20px;
      min-width: 20px;
      padding: 0;
      background: none;
    }
  }

  &:hover .menu {
    visibility: visible;
  }

  .text {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .muted {
    color: var(--color-text-dim);
    font-style: italic;
  }

  .hint {
    font-size: 0.8em;
  }
`;

const DiffTable = styled.div`
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 2px 8px;
  margin: 2px 10px 6px 32px;
  font-size: 0.85em;

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

  .muted {
    color: var(--color-text-dim);
    font-style: italic;
  }
`;

const Separator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 10px 4px;
  font-size: 0.8em;
  color: var(--color-text-dim);

  &::before,
  &::after {
    content: '';
    flex-grow: 1;
    border-top: 1px solid var(--color-surface-04);
  }
`;

//
// Helpers
//

const userName = (id_user: number | null) => {
  if (id_user === null) return 'System';
  const user = nebula.settings?.users?.find((u) => u.id === id_user);
  return user?.full_name || user?.name || `User ${id_user}`;
};

const clockTime = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleTimeString(nebula.locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

export const DaySeparator = ({ timestamp }: { timestamp: number }) => {
  const date = new Date(timestamp * 1000);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  let label: string;
  if (date.toDateString() === today.toDateString()) label = 'Today';
  else if (date.toDateString() === yesterday.toDateString()) label = 'Yesterday';
  else
    label = date.toLocaleDateString(nebula.locale, {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
    });
  return <Separator>{label}</Separator>;
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

const Time = ({ timestamp }: { timestamp: number }) => (
  <span className="time" title={formatTimeString(timestamp)}>
    {clockTime(timestamp)}
  </span>
);

//
// Events
//

const Event = ({
  activity,
  icon,
  iconColor,
  children,
  after,
}: {
  activity: Activity;
  icon: string;
  iconColor?: string;
  children: React.ReactNode;
  after?: React.ReactNode;
}) => (
  <>
    <EventRow>
      <Icon icon={icon} style={{ color: iconColor }} />
      <div className="text">
        <span className="author">{userName(activity.id_user)}</span> {children}
      </div>
      <Time timestamp={activity.ctime} />
    </EventRow>
    {after}
  </>
);

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

const MetaEvent = ({
  activity,
  assetId,
}: {
  activity: Extract<Activity, { kind: 'meta' }>;
  assetId: number;
}) => {
  const [detail, setDetail] = useState<MetaDetail | null | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const toggle = () => {
    setOpen((o) => !o);
    if (detail !== undefined) return;
    fetchActivityDetail(assetId, activity.id)
      .then((d) => {
        setDetail(d ?? null);
      })
      .catch((error: unknown) => {
        toast.error(getErrorDetail(error));
      });
  };

  return (
    <Event
      activity={activity}
      icon="edit"
      after={
        open &&
        detail && (
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
        )
      }
    >
      changed{' '}
      <span className="link" onClick={toggle}>
        {activity.summary.keys
          .map((key) => nebula.metaType(key).title || key)
          .join(', ')}
      </span>
    </Event>
  );
};

const QcEvent = ({ activity }: { activity: Extract<Activity, { kind: 'qc' }> }) => {
  const { old, new: state } = activity.summary;
  const was = old !== null && old !== undefined ? ` (was ${QC_LABELS[old]})` : '';
  if (state === null || state === undefined)
    return (
      <Event activity={activity} icon="flag">
        cleared QC{was}
      </Event>
    );
  return (
    <Event activity={activity} icon="flag" iconColor={QC_COLORS[state]}>
      set QC to <strong style={{ color: QC_COLORS[state] }}>{QC_LABELS[state]}</strong>
      {was}
    </Event>
  );
};

const StatusEvent = ({
  activity,
}: {
  activity: Extract<Activity, { kind: 'status' }>;
}) => {
  const { old, new: status } = activity.summary;
  if (status === ObjectStatus.TRASHED)
    return (
      <Event activity={activity} icon="delete">
        moved the asset to trash
      </Event>
    );
  if (status === ObjectStatus.ARCHIVED)
    return (
      <Event activity={activity} icon="inventory_2">
        archived the asset
      </Event>
    );
  if (old === ObjectStatus.TRASHED || old === ObjectStatus.ARCHIVED)
    return (
      <Event activity={activity} icon="restore_from_trash">
        restored the asset
      </Event>
    );
  return (
    <Event activity={activity} icon="sync_alt">
      changed status to {formatValue('status', status)}
    </Event>
  );
};

//
// Comments
//

const Avatar = ({ id_user }: { id_user: number | null }) => {
  const [failed, setFailed] = useState(false);
  if (id_user === null || failed) {
    const initials = userName(id_user)
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    return <span className="avatar initials">{initials}</span>;
  }
  return (
    <img
      className="avatar"
      src={`/api/v2/users/${id_user}/avatar`}
      alt=""
      onError={() => {
        setFailed(true);
      }}
    />
  );
};

const useCommentActions = (activity: CommentActivity, assetId: number) => {
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

  return { isOwn, canDelete: isOwn || !!nebula.user?.is_admin, save, remove };
};

const CommentBubble = ({
  activity,
  assetId,
}: {
  activity: CommentActivity;
  assetId: number;
}) => {
  const [editing, setEditing] = useState<string | null>(null);
  const { isOwn, canDelete, save, remove } = useCommentActions(activity, assetId);
  const { text } = activity.summary;
  const edited = activity.mtime;

  const options = [
    ...(isOwn
      ? [
          {
            label: 'Edit',
            icon: 'edit',
            onClick: () => {
              setEditing(text ?? '');
            },
          },
        ]
      : []),
    ...(canDelete ? [{ label: 'Delete', icon: 'delete', onClick: remove }] : []),
  ];

  return (
    <Bubble className={isOwn ? 'own' : undefined}>
      <div className="header">
        <Avatar id_user={activity.id_user} />
        <span className="author">{userName(activity.id_user)}</span>
        <Time timestamp={activity.ctime} />
        {options.length > 0 && editing === null && (
          <span className="menu">
            <Dropdown
              icon="more_vert"
              align="right"
              options={options}
              // upwards: the newest comments are at the bottom of the scrolled feed
              contentStyle={{ bottom: '100%' }}
            />
          </span>
        )}
      </div>
      {editing === null ? (
        <div className="text">
          {text}
          {edited && (
            <span className="muted" title={formatTimeString(edited)}>
              {' '}
              (edited)
            </span>
          )}
        </div>
      ) : (
        <>
          <TextArea
            value={editing}
            onChange={setEditing}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                save(editing, () => {
                  setEditing(null);
                });
              }
              if (e.key === 'Escape') setEditing(null);
            }}
            autoFocus
            style={{ width: '100%', height: 56, minHeight: 56, minWidth: 0 }}
          />
          <div className="muted hint">Enter to save, Esc to cancel</div>
        </>
      )}
    </Bubble>
  );
};

//
// One row of the feed
//

export const ActivityItem = ({
  activity,
  assetId,
}: {
  activity: Activity;
  assetId: number;
}) => {
  switch (activity.kind) {
    case 'comment':
      // a deleted comment is a trace in the timeline, not a bubble
      return activity.summary.deleted ? (
        // id_user is the author, not who deleted it
        <Event activity={activity} icon="speaker_notes_off">
          commented <span className="deleted">(deleted)</span>
        </Event>
      ) : (
        <CommentBubble activity={activity} assetId={assetId} />
      );
    case 'new':
      return (
        <Event activity={activity} icon="add_circle">
          created the asset
        </Event>
      );
    case 'meta':
      return <MetaEvent activity={activity} assetId={assetId} />;
    case 'qc':
      return <QcEvent activity={activity} />;
    case 'status':
      return <StatusEvent activity={activity} />;
    case 'upload':
      return (
        <Event activity={activity} icon="upload_file">
          uploaded a file · {formatSize(activity.summary.size)}{' '}
          {activity.summary.extension}
        </Event>
      );
    default:
      // a kind from a newer server
      return (
        <Event activity={activity} icon="help">
          {(activity as { kind: string }).kind}
        </Event>
      );
  }
};
