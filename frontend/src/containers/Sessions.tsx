import { Table, Timestamp, Section, Button } from '@components';
import type { TableRowData } from '@components/table/types';
import React, { useState, useEffect, useCallback } from 'react';

import type { SessionModel } from '@/client';
import nebula from '@/nebula';

const FormattedTimestamp = (rowData: TableRowData) => {
  const session = rowData as SessionModel;
  const timestamp = session.accessed;
  return (
    <td>
      <Timestamp timestamp={timestamp} />
    </td>
  );
};

const FormattedClientInfo = (rowData: TableRowData) => {
  const session = rowData as SessionModel;
  const clientInfo = session.client_info;

  return (
    <td>
      {clientInfo?.ip || 'Unknown'} ({clientInfo?.agent?.platform || 'Unknown'}{' '}
      {clientInfo?.agent?.client || ''})
    </td>
  );
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
      .request('list-sessions', { id_user: userId })
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

  const invalidateSession = useCallback(
    (token: string) => {
      void nebula
        .request('invalidate-session', { token })
        .then(() => {
          void loadSessions();
        })
        .catch((err: unknown) => {
          console.error(err);
        });
    },
    [loadSessions]
  );

  useEffect(() => {
    void loadSessions();
  }, [userId, loadSessions]);

  const invalidateFormatter = (rowData: TableRowData) => {
    const session = rowData as SessionModel;
    const token = session.token;
    return (
      <td style={{ textAlign: 'right' }} className="action">
        <Button
          onClick={() => {
            invalidateSession(token);
          }}
          label="Invalidate"
        />
      </td>
    );
  };

  return (
    <Section className="column grow" style={{ minWidth: 400 }}>
      <Table
        data={sessions}
        loading={loading}
        className="contained"
        keyField="token"
        columns={[
          {
            name: 'client_info',
            title: 'Active session',
            formatter: FormattedClientInfo,
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
            width: 100,
            formatter: invalidateFormatter,
          },
        ]}
      />
    </Section>
  );
};

export default Sessions;
