import { Loader, Section, TextArea } from '@components';
import { useWebSocket, type WebSocketHandler } from '@features/Websocket';
import { getErrorDetail } from '@lib/utils';
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import styled from 'styled-components';

import { addComment, fetchActivities, fetchActivity, type Activity } from '../assetApi';

import { ActivityItem, DaySeparator } from './ActivityItem';

// local calendar day, to put a separator between days
const dayKey = (timestamp: number) => new Date(timestamp * 1000).toDateString();

// how close to the bottom (px) still counts as "at the bottom"
const STICK_DISTANCE = 30;

const Feed = styled.div`
  overflow-y: auto;

  .empty {
    padding: 16px 10px;
    color: var(--color-text-dim);
  }
`;

const Composer = styled(Section)`
  padding: 6px;
`;

// Newest first, as the API lists them; rows of `page` replace older copies
const merge = (current: Activity[], page: Activity[]) => {
  const byId = new Map(current.map((a) => [a.id, a]));
  for (const a of page) byId.set(a.id, a);
  return [...byId.values()].sort((a, b) => b.id - a.id);
};

export const SidePanelActivity = ({ assetId }: { assetId: number }) => {
  // newest first; rendered in reverse, the newest at the bottom
  const [items, setItems] = useState<Activity[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const { subscribe } = useWebSocket();

  const feedRef = useRef<HTMLDivElement>(null);
  // drop responses of an earlier asset
  const generationRef = useRef(0);
  // follow new rows while the feed is scrolled to the bottom
  const stickRef = useRef(true);
  // scroll height before older rows were added above, to keep the view still
  const olderFromRef = useRef<number | null>(null);

  const load = useCallback(
    (cursor?: string) => {
      const generation = generationRef.current;
      setLoading(true);
      fetchActivities(assetId, undefined, cursor)
        .then((page) => {
          if (generation !== generationRef.current) return;
          setItems((current) => merge(current, page.items));
          setNextCursor(page.next_cursor ?? null);
        })
        .catch((error: unknown) => {
          toast.error(getErrorDetail(error));
        })
        .finally(() => {
          if (generation === generationRef.current) setLoading(false);
        });
    },
    [assetId]
  );

  // A new asset starts over
  useEffect(() => {
    generationRef.current++;
    stickRef.current = true;
    setItems([]);
    setNextCursor(null);
    load();
  }, [load]);

  useEffect(() => {
    const onActivity: WebSocketHandler<'activity'> = (_topic, message) => {
      if (message.id_asset !== assetId) return;
      // only the row the message names: new, or an edited or deleted comment
      const generation = generationRef.current;
      fetchActivity(assetId, message.id)
        .then((activity) => {
          if (generation === generationRef.current)
            setItems((current) => merge(current, [activity]));
        })
        .catch((error: unknown) => {
          toast.error(getErrorDetail(error));
        });
    };
    return subscribe('activity', onActivity);
  }, [subscribe, assetId]);

  useLayoutEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    if (olderFromRef.current !== null) {
      el.scrollTop += el.scrollHeight - olderFromRef.current;
      olderFromRef.current = null;
    } else if (stickRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [items]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    stickRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < STICK_DISTANCE;
    if (el.scrollTop < 100 && nextCursor && !loading) {
      olderFromRef.current = el.scrollHeight;
      load(nextCursor);
    }
  };

  const onPost = () => {
    const posted = text;
    if (!posted.trim()) return;
    // cleared at once so a second Enter has nothing to send
    setText('');
    stickRef.current = true;
    addComment(assetId, posted).catch((error: unknown) => {
      setText(posted);
      toast.error(getErrorDetail(error));
    });
  };

  return (
    <>
      <Section className="grow" style={{ padding: 0 }}>
        <Feed className="contained feed" ref={feedRef} onScroll={onScroll}>
          {loading && !items.length && <Loader />}
          {!loading && !items.length && <div className="empty">No activity yet</div>}
          {items.toReversed().map((activity, idx, oldestFirst) => (
            <Fragment key={activity.id}>
              {(idx === 0 ||
                dayKey(oldestFirst[idx - 1].ctime) !== dayKey(activity.ctime)) && (
                <DaySeparator timestamp={activity.ctime} />
              )}
              <ActivityItem activity={activity} assetId={assetId} />
            </Fragment>
          ))}
        </Feed>
      </Section>
      <Composer>
        <TextArea
          value={text}
          onChange={setText}
          placeholder="Write a comment... (Enter to send, Shift+Enter for a new line)"
          style={{ flexGrow: 1, height: 56, minHeight: 56, minWidth: 0 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onPost();
            }
          }}
        />
      </Composer>
    </>
  );
};
