import { Table, Timestamp, Section, Button, Icon, PanelHeader } from '@components';
import type { TableRowData } from '@components/table/types';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import type { SessionModel } from '@/client';
import nebula from '@/nebula';

// The token is stored JSON-encoded by useLocalStorage
const getCurrentToken = (): string | null => {
  try {
    return JSON.parse(localStorage.getItem('accessToken') || 'null') as string | null;
  } catch {
    return null;
  }
};

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
    <td>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Icon
          icon={clientIcon(session)}
          style={{ fontSize: 18, color: 'var(--color-text-dim)' }}
        />
        {label}
      </span>
    </td>
  );
};

const FormattedIp = (rowData: TableRowData) => {
  const session = rowData as SessionModel;
  return <td className="monospace">{session.client_info?.ip || 'Unknown'}</td>;
};

const FormattedTimestamp = (rowData: TableRowData) => {
  const session = rowData as SessionModel;
  const timestamp = session.accessed;
  return (
    <td>
      <Timestamp timestamp={timestamp} />
    </td>
  );
};

interface SessionsProps {
  userId?: number | null;
}

const Sessions: React.FC<SessionsProps> = ({ userId }) => {
  const [sessions, setSessions] = useState<SessionModel[]>([]);
  const [loading, setLoading] = useState(false);
  const currentToken = useMemo(() => getCurrentToken(), []);

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

  const otherTokens = sessions
    .map((session) => session.token)
    .filter((token) => token !== currentToken);
  // On the admin users page the list usually doesn't contain our own session
  const hasCurrent = otherTokens.length < sessions.length;

  const invalidateFormatter = (rowData: TableRowData) => {
    const session = rowData as SessionModel;
    const token = session.token;
    if (token === currentToken) {
      return (
        <td className="dim" style={{ textAlign: 'right' }}>
          This session
        </td>
      );
    }
    return (
      <td style={{ textAlign: 'right' }}>
        <Button
          icon="logout"
          label="Invalidate"
          style={{ background: 'none' }}
          onClick={() => {
            invalidateSessions([token]);
          }}
        />
      </td>
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
          keyField="token"
          rowHighlightColor={(rowData) =>
            (rowData as SessionModel).token === currentToken
              ? 'var(--color-cyan)'
              : undefined
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
