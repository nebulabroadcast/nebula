import { Table, Timestamp, Section, Button, Icon, PanelHeader } from '@components';
import type { TableRowData } from '@components/table/types';
import React, { useState, useEffect, useCallback } from 'react';

import type { SessionListItem as SessionModel } from '@/client';
import nebula from '@/nebula';

const clientIcon = (session: SessionModel): string => {
  const agent = session.client_info?.agent;
  const device = (agent?.device || '').toLowerCase();
  if (device.includes('mobile') || device.includes('phone')) return 'smartphone';
  if (device.includes('tablet')) return 'tablet';
  // Browser sessions run on laptops/desktops alike, native clients on workstations
  const client = (agent?.client || '').toLowerCase();
  if (/chrome|firefox|safari|edge|opera/.test(client)) return 'computer';
  return 'desktop_windows';
};

const FormattedClient = (rowData: TableRowData) => {
  const session = rowData as SessionModel;
  const agent = session.client_info?.agent;
  const label = [agent?.platform, agent?.client].filter(Boolean).join(' ') || 'Unknown';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <Icon
        icon={clientIcon(session)}
        style={{ fontSize: 18, color: 'var(--color-text-dim)' }}
      />
      {label}
    </span>
  );
};

const FormattedIp = (rowData: TableRowData) => {
  const session = rowData as SessionModel;
  return <span className="monospace">{session.client_info?.ip || 'Unknown'}</span>;
};

const FormattedTimestamp = (rowData: TableRowData) => {
  const session = rowData as SessionModel;
  const timestamp = session.accessed;
  return <Timestamp timestamp={timestamp} />;
};

interface SessionsProps {
  userId?: number | null;
}

const Sessions: React.FC<SessionsProps> = ({ userId }) => {
  const [sessions, setSessions] = useState<SessionModel[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSessions = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    return nebula
      .listSessions({ body: { id_user: userId }, throwOnError: true })
      .then((res) => {
        setSessions(res.data);
      })
      .catch((err: unknown) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId]);

  const invalidateSessions = useCallback(
    (tokens: string[]) => {
      // There is no bulk endpoint, so invalidate sessions one by one
      void Promise.all(
        tokens.map((token) =>
          nebula.invalidateSession({ body: { token }, throwOnError: true })
        )
      )
        .catch((err: unknown) => {
          console.error(err);
        })
        .finally(() => {
          void loadSessions();
        });
    },
    [loadSessions]
  );

  useEffect(() => {
    void loadSessions();
  }, [userId, loadSessions]);

  // The server marks the session this page is using
  const otherTokens = sessions
    .filter((session) => !session.current)
    .map((session) => session.id);
  // On the admin users page the list usually doesn't contain our own session
  const hasCurrent = otherTokens.length < sessions.length;

  const invalidateFormatter = (rowData: TableRowData) => {
    const session = rowData as SessionModel;
    const token = session.id;
    if (session.current) {
      return (
        <span style={{ fontSize: '0.8em', color: 'var(--color-text-dim)' }}>
          This session
        </span>
      );
    }
    return (
      <Button
        icon="logout"
        label="Invalidate"
        style={{ background: 'none' }}
        onClick={() => {
          invalidateSessions([token]);
        }}
      />
    );
  };

  return (
    <Section className="column grow" style={{ minWidth: 400 }}>
      <PanelHeader>
        <Icon icon="devices" />
        Active sessions
        <span
          style={{ fontSize: 12, fontWeight: 'normal', color: 'var(--color-text-dim)' }}
        >
          {sessions.length}
        </span>
      </PanelHeader>
      <div className="grow">
        <Table
          data={sessions}
          loading={loading}
          className="contained"
          keyField="id"
          rowHighlightColor={(rowData) =>
            (rowData as SessionModel).current ? 'var(--color-cyan)' : undefined
          }
          columns={[
            {
              name: 'client_info',
              title: 'Client',
              formatter: FormattedClient,
            },
            {
              name: 'ip',
              title: 'IP address',
              width: 130,
              formatter: FormattedIp,
            },
            {
              name: 'accessed',
              title: 'Last used',
              width: 150,
              formatter: FormattedTimestamp,
            },
            {
              name: 'invalidate',
              title: '',
              width: 110,
              formatter: invalidateFormatter,
              style: { textAlign: 'right' },
            },
          ]}
        />
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button
          icon="logout"
          label={hasCurrent ? 'Invalidate other sessions' : 'Invalidate all sessions'}
          disabled={otherTokens.length === 0}
          onClick={() => {
            invalidateSessions(otherTokens);
          }}
        />
      </div>
    </Section>
  );
};

export default Sessions;
