import nebula from '@/nebula';

import { Table, Button, InputSwitch, Spacer, Section, Icon } from '@components';
import { useNebula } from '@features/Nebula';
import { useWebSocket } from '@features/Websocket';
import { Duration } from 'luxon';
import React, { useEffect, useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import type { ServiceListItem } from '../../../client';

const blink = keyframes`
  0% { opacity: 1; transform: scale(1.2); }
  50% { opacity: 1; }
  100% { opacity: 0.3;  transform: scale(1); }
`;

const BlinkIcon = styled(Icon)`
  font-size: 14px !important;
  margin-right: 8px;
  vertical-align: middle;
  animation: ${blink} 1s ease-out;
  opacity: 0.3;

  &.status-0 {
    color: var(--color-red);
  }
  &.status-1 {
    color: var(--color-green);
  }
  &.status-2 {
    color: var(--color-yellow);
  }
  &.status-3 {
    color: var(--color-yellow);
  }
  &.status-4 {
    color: var(--color-red);
  }
`;

const formatStatus = (rowData: any, key: string) => {
  const status = rowData[key];
  switch (status) {
    case 0:
      return <td>Stopped</td>;
    case 1:
      return <td>Running</td>;
    case 2:
      return <td>Starting</td>;
    case 3:
      return <td>Stopping</td>;
    case 4:
      return <td>Killing</td>;
    default:
      return <td>Unknown</td>;
  }
};

const formatLastSeen = (rowData: any, key: string) => {
  const lastSeen = rowData[key] as number;

  const when =
    lastSeen < 2
      ? 'Now'
      : lastSeen > 1234567890
        ? 'Never'
        : Duration.fromObject({ seconds: lastSeen }).rescale().toHuman() + ' ago';

  return (
    <td>
      <BlinkIcon
        key={rowData.last_updated || 0}
        icon="circle"
        className={`status-${rowData.status}`}
      />
      {when}
    </td>
  );
};

interface ExtendedServiceItem extends ServiceListItem {
  last_updated?: number;
}

const ServicesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ExtendedServiceItem[]>([]);
  const ws = useWebSocket();
  const { setPageTitle } = useNebula();

  const makeRequest = (action?: string, id_service?: number) => {
    const payload: Record<string, any> = {};
    if (action && id_service) {
      payload[action] = id_service;
    }
    setLoading(true);
    nebula
      .request('services', payload)
      .then((response) => setServices(response.data.services))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPageTitle('Services');
    makeRequest();
  }, [setPageTitle]);

  const formatAutoStart = (rowData: any, key: string) => {
    const autoStart = rowData[key] || false;

    const onChange = () => {
      makeRequest('auto', rowData.id);
    };

    return (
      <td style={{ textAlign: 'center' }}>
        <Spacer>
          <InputSwitch value={autoStart} onChange={onChange} className="small" />
        </Spacer>
      </td>
    );
  };

  const formatAction = (rowData: any) => {
    const status = rowData.status;
    let b = null;
    switch (status) {
      case 0:
        b = <Button onClick={() => makeRequest('start', rowData.id)} label="Start" />;
        break;
      case 1:
        b = <Button onClick={() => makeRequest('stop', rowData.id)} label="Stop" />;
        break;
      case 3:
        b = <Button onClick={() => makeRequest('kill', rowData.id)} label="Kill" />;
        break;
      default:
        b = <Button disabled={true} label="Please wait..." />;
    }
    return <td className="action">{b}</td>;
  };

  const columns = useMemo(
    () => [
      { name: 'id', title: '#', width: 1 },
      { name: 'name', title: 'Name' },
      { name: 'type', title: 'Type', width: 200 },
      { name: 'hostname', title: 'Hostname', width: 200 },
      { name: 'status', title: 'Status', width: 200, formatter: formatStatus },
      {
        name: 'last_seen',
        title: 'Last seen',
        width: 300,
        formatter: formatLastSeen,
      },
      {
        name: 'autostart',
        title: 'Auto start',
        width: 70,
        formatter: formatAutoStart,
      },
      { name: 'action', title: 'Action', width: 100, formatter: formatAction },
    ],
    []
  );

  useEffect(() => {
    const handlePubSub = (topic: string, message: any) => {
      if (topic !== 'service_state') return;
      console.log('WS Message:', topic, message.id, message.state);
      setServices((prevData) => {
        const index = prevData.findIndex((service) => service.id === message.id);
        if (index === -1) return prevData;

        const newData = [...prevData];
        newData[index] = {
          ...newData[index],
          status: message.state,
          last_seen: message.last_seen_before,
          autostart: message.autostart,
          last_updated: Date.now(),
        };
        return newData;
      });
    };

    const unsubscribe = ws.subscribe('service_state', handlePubSub);
    return () => {
      unsubscribe();
    };
  }, [ws]);

  return (
    <Section className="grow">
      <Table
        data={services}
        columns={columns}
        className="contained"
        keyField="id"
        loading={loading}
      />
    </Section>
  );
};

export default ServicesPage;
