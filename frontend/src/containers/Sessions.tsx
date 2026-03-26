import React, { useState, useEffect } from 'react';

import nebula from '@/nebula';
import { Table, Timestamp, Section, Button } from '@components';
import type { SessionModel } from '@/client';
import type { TableRowData } from '@components/table/types';

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

  const loadSessions = () => {
    if (!userId) return;
    setLoading(true);
    nebula
      .request('list-sessions', { id_user: userId })
      .then((res) => {
        setSessions(res.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSessions();
  }, [userId]);

  const invalidateSession = (token: string) => {
    nebula
      .request('invalidate-session', { token })
      .then(() => {
        loadSessions();
      })
      .catch((err) => console.error(err));
  };

  const invalidateFormatter = (rowData: TableRowData) => {
    const session = rowData as SessionModel;
    const token = session.token;
    return (
      <td style={{ textAlign: 'right' }} className="action">
        <Button onClick={() => invalidateSession(token)} label="Invalidate" />
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
