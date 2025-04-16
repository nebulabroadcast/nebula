import { useState, useEffect } from 'react';

import nebula from '/src/nebula';
import { Table, Timestamp } from '/src/components';

import styled from 'styled-components';

const InvalidateButton = styled.button`
  background: none;
  border: none;
  color: var(--color-red);
  cursor: pointer;
  padding: 0;
  margin: 0;
`;

const FormattedTimestamp = (rowData) => {
  const timestamp = parseInt(rowData['accessed']);
  return (
    <td>
      <Timestamp timestamp={timestamp} />
    </td>
  );
};

const FormattedClientInfo = (rowData) => {
  const clientInfo = rowData['client_info'];

  return (
    <td>
      {clientInfo?.ip || 'Unknown'} ({clientInfo?.agent?.platform || 'Unknown'}{' '}
      {clientInfo?.agent?.client || ''})
    </td>
  );
};

const Sessions = ({ userId }) => {
  const [sessions, setSessions] = useState([]);
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

  const invalidateSession = (token) => {
    nebula
      .request('invalidate-session', { token })
      .then(() => {
        loadSessions();
      })
      .catch((err) => console.error(err));
  };

  const invalidateFormatter = (rowData) => {
    const token = rowData['token'];
    return (
      <td style={{ textAlign: 'right' }}>
        <InvalidateButton onClick={() => invalidateSession(token)}>
          Invalidate
        </InvalidateButton>
      </td>
    );
  };

  return (
    <section className="column grow" style={{ minWidth: 400 }}>
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
    </section>
  );
};

export default Sessions;
