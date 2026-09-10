import {
  Button,
  Dialog,
  ErrorBanner,
  Form,
  FormRow,
  InputDatetime,
  InputInteger,
  InputSwitch,
  RadioButton,
  ScrollBox,
  Select,
  Timestamp,
} from '@components';
import {
  computeOccurrences,
  RecurrenceEndMode,
  RecurrenceFreq,
  RecurrenceOptions,
  WEEKDAYS,
} from '@containers/Calendar/seriesRecurrence';
import { DateTime } from 'luxon';
import { useEffect, useMemo, useState } from 'react';

import type { EventData } from '@/client';
import nebula from '@/nebula';

interface SeriesEpisode {
  id: number;
  title?: string;
  season: number | null;
  episode: number | null;
  ctime: number | null;
  duration?: number;
}

interface EpisodeRow extends SeriesEpisode {
  isAnchor: boolean;
  beforeAnchor: boolean;
  checked: boolean; // user's toggle intention, independent of whether a date could be computed
  included: boolean; // checked AND has a computed date - i.e. will actually be submitted
  date: DateTime | null;
}

interface SeasonGroup {
  key: string;
  season: number | null;
  rows: EpisodeRow[];
}

interface SeriesScheduleDialogProps {
  title: React.ReactNode;
  anchorAssetId: number;
  serieId: string;
  anchorStart: number; // unix timestamp (seconds)
  handleConfirm: (events: EventData[]) => void;
  handleCancel: () => void;
}

const sortEpisodes = (episodes: SeriesEpisode[]): SeriesEpisode[] => {
  return [...episodes].sort((a, b) => {
    if (
      a.season !== null &&
      a.episode !== null &&
      b.season !== null &&
      b.episode !== null
    ) {
      if (a.season !== b.season) return a.season - b.season;
      return a.episode - b.episode;
    }
    return (a.ctime || 0) - (b.ctime || 0);
  });
};

const FREQ_OPTIONS = [
  { value: 'DAILY', title: 'Daily' },
  { value: 'WEEKLY', title: 'Weekly' },
  { value: 'MONTHLY', title: 'Monthly' },
  { value: 'YEARLY', title: 'Yearly' },
];

const END_MODE_OPTIONS = [
  { value: 'never', title: 'Never' },
  { value: 'until', title: 'Until date' },
  { value: 'count', title: 'After N episodes' },
];

const SeriesScheduleDialog = ({
  title,
  anchorAssetId,
  serieId,
  anchorStart,
  handleConfirm,
  handleCancel,
}: SeriesScheduleDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<SeriesEpisode[]>([]);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [collapsedSeasons, setCollapsedSeasons] = useState<Set<string>>(new Set());
  const [fillGaps, setFillGaps] = useState(false);
  const [scheduleBackward, setScheduleBackward] = useState(false);

  const anchor = useMemo(() => DateTime.fromSeconds(anchorStart), [anchorStart]);

  const [recurrence, setRecurrence] = useState<RecurrenceOptions>({
    freq: 'WEEKLY',
    interval: 1,
    byweekday: [anchor.weekday],
    endMode: 'never',
    until: null,
    count: null,
  });

  useEffect(() => {
    setLoading(true);
    nebula
      .browse({
        body: {
          conditions: [{ key: 'serie', value: serieId, operator: '=' }],
          columns: ['title', 'serie/season', 'serie/episode', 'duration', 'ctime'],
          limit: 500,
          order_by: 'ctime',
          order_dir: 'asc',
        },
        throwOnError: true,
      })
      .then((res) => {
        const rows = (res.data.data || []).map((row: Record<string, unknown>) => ({
          id: row.id as number,
          title: row.title as string | undefined,
          season: (row['serie/season'] as number | undefined) ?? null,
          episode: (row['serie/episode'] as number | undefined) ?? null,
          ctime: (row.ctime as number | undefined) ?? null,
          duration: row.duration as number | undefined,
        }));
        setEpisodes(sortEpisodes(rows));
      })
      .catch(() => {
        setError('Failed to load series episodes');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [serieId]);

  const anchorIndex = useMemo(
    () => episodes.findIndex((e) => e.id === anchorAssetId),
    [episodes, anchorAssetId]
  );

  const occurrences = useMemo(() => {
    if (anchorIndex < 0)
      return { forward: [] as DateTime[], backward: [] as DateTime[] };
    return computeOccurrences({
      anchor,
      options: recurrence,
      forwardCount: episodes.length - anchorIndex - 1,
      backwardCount: scheduleBackward ? anchorIndex : 0,
    });
  }, [anchor, recurrence, episodes.length, anchorIndex, scheduleBackward]);

  const rows: EpisodeRow[] = useMemo(() => {
    if (anchorIndex < 0) return [];

    const checkedByIndex = episodes.map(
      (ep, i) => i === anchorIndex || !excluded.has(ep.id)
    );
    const dates: Array<DateTime | null> = new Array(episodes.length).fill(null);
    dates[anchorIndex] = anchor;

    if (fillGaps) {
      // Only checked episodes consume a computed slot, so skipped episodes
      // leave no gap - the next checked episode in each direction takes
      // the next available slot, working outward from the anchor.
      let fi = 0;
      for (let i = anchorIndex + 1; i < episodes.length; i++) {
        if (!checkedByIndex[i]) continue;
        dates[i] = occurrences.forward[fi] ?? null;
        fi += 1;
      }
      let bi = occurrences.backward.length - 1;
      for (let i = anchorIndex - 1; i >= 0; i--) {
        if (!checkedByIndex[i]) continue;
        dates[i] = occurrences.backward[bi] ?? null;
        bi -= 1;
      }
    } else {
      // Every episode keeps the slot matching its position in the series,
      // whether or not it's checked - skipping one leaves its slot empty.
      for (let i = 0; i < episodes.length; i++) {
        if (i === anchorIndex) continue;
        dates[i] =
          i < anchorIndex
            ? (occurrences.backward[i] ?? null)
            : (occurrences.forward[i - anchorIndex - 1] ?? null);
      }
    }

    return episodes.map((ep, i) => ({
      ...ep,
      isAnchor: i === anchorIndex,
      beforeAnchor: i < anchorIndex,
      checked: checkedByIndex[i],
      included: checkedByIndex[i] && dates[i] !== null,
      date: dates[i],
    }));
  }, [episodes, anchorIndex, anchor, occurrences, excluded, fillGaps]);

  const seasonGroups: SeasonGroup[] = useMemo(() => {
    const groups: SeasonGroup[] = [];
    const byKey = new Map<string, SeasonGroup>();
    const visibleRows = scheduleBackward ? rows : rows.filter((r) => !r.beforeAnchor);
    for (const row of visibleRows) {
      const key = row.season !== null ? `s${row.season}` : 'none';
      let group = byKey.get(key);
      if (!group) {
        group = { key, season: row.season, rows: [] };
        byKey.set(key, group);
        groups.push(group);
      }
      group.rows.push(row);
    }
    return groups;
  }, [rows, scheduleBackward]);

  const toggleExcluded = (id: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSeason = (group: SeasonGroup) => {
    const toggleable = group.rows.filter((r) => !r.isAnchor);
    const allChecked = toggleable.every((r) => r.checked);

    setExcluded((prev) => {
      const next = new Set(prev);
      for (const row of toggleable) {
        if (allChecked) next.add(row.id);
        else next.delete(row.id);
      }
      return next;
    });

    setCollapsedSeasons((prev) => {
      const next = new Set(prev);
      if (allChecked) next.add(group.key);
      else next.delete(group.key);
      return next;
    });
  };

  const onConfirm = () => {
    const events: EventData[] = [];
    for (const r of rows) {
      if (!r.included || !r.date) continue;
      events.push({ id_asset: r.id, start: Math.floor(r.date.toSeconds()) });
    }
    handleConfirm(events);
  };

  const footer = (
    <>
      <Button
        onClick={handleCancel}
        label="Cancel"
        icon="close"
        hlColor="var(--color-red)"
      />
      <Button
        onClick={onConfirm}
        label="Schedule series"
        icon="check"
        hlColor="var(--color-green)"
        disabled={loading || anchorIndex < 0}
      />
    </>
  );

  return (
    <Dialog
      onHide={handleCancel}
      header={title}
      footer={footer}
      style={{ width: '700px', maxWidth: '90vw' }}
    >
      {error && <ErrorBanner>{error}</ErrorBanner>}
      {!error && (
        <>
          <Form>
            <FormRow
              title="Schedule earlier episodes"
              tooltip="By default only the dropped episode and later ones are scheduled. Enable this to also schedule episodes before it, backwards from the anchor."
            >
              <InputSwitch value={scheduleBackward} onChange={setScheduleBackward} />
            </FormRow>
            <FormRow title="Frequency">
              <Select
                value={recurrence.freq}
                options={FREQ_OPTIONS}
                onChange={(v) => {
                  setRecurrence((r) => ({
                    ...r,
                    freq: (v as RecurrenceFreq) || 'WEEKLY',
                  }));
                }}
              />
            </FormRow>
            <FormRow title="Repeat every">
              <InputInteger
                value={recurrence.interval}
                min={1}
                onChange={(v) => {
                  setRecurrence((r) => ({ ...r, interval: v || 1 }));
                }}
              />
            </FormRow>
            {recurrence.freq === 'WEEKLY' && (
              <FormRow title="On days">
                <div style={{ display: 'flex', gap: '4px' }}>
                  {WEEKDAYS.map((w) => (
                    <Button
                      key={w.luxonWeekday}
                      label={w.label}
                      active={recurrence.byweekday.includes(w.luxonWeekday)}
                      onClick={() => {
                        setRecurrence((r) => {
                          const has = r.byweekday.includes(w.luxonWeekday);
                          const byweekday = has
                            ? r.byweekday.filter((d) => d !== w.luxonWeekday)
                            : [...r.byweekday, w.luxonWeekday];
                          return {
                            ...r,
                            byweekday: byweekday.length ? byweekday : r.byweekday,
                          };
                        });
                      }}
                    />
                  ))}
                </div>
              </FormRow>
            )}
            <FormRow title="Ends">
              <RadioButton
                options={END_MODE_OPTIONS}
                value={recurrence.endMode}
                onChange={(v) => {
                  setRecurrence((r) => ({ ...r, endMode: v as RecurrenceEndMode }));
                }}
              />
            </FormRow>
            {recurrence.endMode === 'until' && (
              <FormRow title="Until">
                <InputDatetime
                  mode="date"
                  placeholder="yyyy-MM-dd"
                  className=""
                  value={
                    recurrence.until ? Math.floor(recurrence.until.toSeconds()) : 0
                  }
                  onChange={(v) => {
                    setRecurrence((r) => ({
                      ...r,
                      until: v ? DateTime.fromSeconds(v) : null,
                    }));
                  }}
                />
              </FormRow>
            )}
            {recurrence.endMode === 'count' && (
              <FormRow title="Number of episodes">
                <InputInteger
                  value={recurrence.count ?? null}
                  min={1}
                  onChange={(v) => {
                    setRecurrence((r) => ({ ...r, count: v }));
                  }}
                />
              </FormRow>
            )}
            <FormRow
              title="Avoid gaps"
              tooltip="When an episode is skipped, shift the next episode into its slot instead of leaving the slot empty"
            >
              <InputSwitch value={fillGaps} onChange={setFillGaps} />
            </FormRow>
          </Form>

          <ScrollBox style={{ height: '320px', marginTop: '8px' }}>
            {loading && <div>Loading episodes...</div>}
            {!loading &&
              seasonGroups.map((group) => {
                const toggleable = group.rows.filter((r) => !r.isAnchor);
                const allChecked =
                  toggleable.length === 0 || toggleable.every((r) => r.checked);
                const collapsed = collapsedSeasons.has(group.key);
                return (
                  <div key={group.key}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px 8px',
                        background: 'var(--color-surface-03)',
                        fontWeight: 'bold',
                      }}
                    >
                      <InputSwitch
                        value={allChecked}
                        disabled={toggleable.length === 0}
                        onChange={() => {
                          toggleSeason(group);
                        }}
                      />
                      <span style={{ flexGrow: 1 }}>
                        {group.season !== null ? `Season ${group.season}` : 'No season'}
                        {` (${group.rows.length})`}
                      </span>
                    </div>
                    {!collapsed &&
                      group.rows.map((row) => (
                        <div
                          key={row.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '4px 8px',
                            background: row.isAnchor
                              ? 'var(--color-surface-05)'
                              : undefined,
                          }}
                        >
                          <InputSwitch
                            value={row.checked}
                            disabled={row.isAnchor || !row.date}
                            onChange={() => {
                              toggleExcluded(row.id);
                            }}
                          />
                          <span style={{ width: '90px', opacity: 0.7 }}>
                            {row.season !== null && row.episode !== null
                              ? `S${row.season}E${row.episode}`
                              : '—'}
                          </span>
                          <span style={{ flexGrow: 1 }}>{row.title}</span>
                          {row.date ? (
                            <Timestamp timestamp={Math.floor(row.date.toSeconds())} />
                          ) : (
                            <span style={{ opacity: 0.5 }}>no date</span>
                          )}
                        </div>
                      ))}
                  </div>
                );
              })}
          </ScrollBox>
        </>
      )}
    </Dialog>
  );
};

export default SeriesScheduleDialog;
