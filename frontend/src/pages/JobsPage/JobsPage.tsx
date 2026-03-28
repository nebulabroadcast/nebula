import nebula from '@/nebula';

import { Table, Button, Section } from '@components';
import { useNebula } from '@features/Nebula';
import formatMetaDatetime from '@lib/tableFormat/formatMetaDatetime';
import { useState, useEffect, useCallback } from 'react';
import { NavLink, useParams } from 'react-router';
import type { AxiosResponse } from 'axios';

import type { JobsItemModel } from '../../client';
import JobsNav from './JobsNav';

import { useWebSocket } from '@/features/Websocket';

const NOT_RESTARTABLE = ['import'];

const formatTitle = (rowData: any, key: string) => {
  return (
    <td>
      <NavLink to={`/mam/editor?asset=${rowData['id_asset']}`}>{rowData[key]}</NavLink>
    </td>
  );
};

const JobsPage = () => {
  const { view } = useParams<{ view?: string }>();
  const [jobs, setJobs] = useState<JobsItemModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { setPageTitle } = useNebula();
  const ws = useWebSocket();

  const loadJobs = useCallback(() => {
    setLoading(true);
    const cleanTitle = view ? view[0].toUpperCase() + view.slice(1) + ' jobs' : 'Jobs';
    setPageTitle(cleanTitle);
    nebula
      .request('jobs', { view, search_query: searchQuery })
      .then((response: AxiosResponse) => {
        setJobs(response.data.jobs);
      })
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  }, [searchQuery, view, setPageTitle]);

  useEffect(() => {
    loadJobs();
  }, [jobs.map((job) => job.status).join(','), view, searchQuery, loadJobs]);

  const restartJob = (id: number) => {
    nebula.request('jobs', { restart: id }).then(() => loadJobs());
  };

  const abortJob = (id: number) => {
    nebula.request('jobs', { abort: id }).then(() => loadJobs());
  };

  const formatAction = (rowData: any) => {
    if ([0, 1, 5].includes(rowData['status']))
      return (
        <td className="action">
          <Button onClick={() => abortJob(rowData['id'])} label="Abort" />
        </td>
      );
    else if ([2, 3, 4, 6].includes(rowData['status']))
      return (
        <td className="action">
          <Button
            onClick={() => restartJob(rowData['id'])}
            disabled={NOT_RESTARTABLE.includes(rowData['service_type'])}
            label="Restart"
          />
        </td>
      );
    else return <td className="action">-</td>;
  };

  const formatPriority = (rowData: any, key: string) => {
    const enabled = [0, 5].includes(rowData['status']);

    const setPriority = (priority: number) => {
      nebula.request('jobs', { priority: [rowData.id, priority] }).then(() => {
        loadJobs();
      });
    };

    const PRIORITIES = [
      { label: 'Hold', color: 'var(--color-violet)' },
      { label: 'Lowest', color: 'var(--color-magenta)' },
      { label: 'Low', color: 'var(--color-blue)' },
      { label: 'Normal', color: 'var(--color-green)' },
      { label: 'High', color: 'var(--color-yellow)' },
      { label: 'Highest', color: 'var(--color-red)' },
    ];

    if (!enabled) return <td>&nbsp;</td>;

    const currentPriority = rowData[key] as number;

    return (
      <td onClick={() => setPriority((currentPriority + 1) % 6)}>
        <span
          style={{
            color: PRIORITIES[currentPriority].color,
            fontSize: '0.8rem',
            userSelect: 'none',
          }}
        >
          {PRIORITIES[currentPriority].label}
        </span>
      </td>
    );
  };

  const COLUMNS = [
    { name: 'id', title: '#', width: 1 },
    { name: 'idec', title: 'IDEC', width: 1 },
    { name: 'asset_name', title: 'Asset', formatter: formatTitle },
    { name: 'action_name', title: 'Action' },
    { name: 'service_name', title: 'Service' },
    {
      name: 'ctime',
      title: 'Created',
      className: 'time',
      formatter: formatMetaDatetime,
      width: 150,
    },
    {
      name: 'stime',
      title: 'Started',
      className: 'time',
      formatter: formatMetaDatetime,
      width: 150,
    },
    {
      name: 'etime',
      title: 'Finished',
      className: 'time',
      formatter: formatMetaDatetime,
      width: 150,
    },
    { name: 'message', title: 'Message', className: 'job-message', width: 400 },
    {
      name: 'priority',
      title: 'Priority',
      width: 1,
      formatter: formatPriority,
    },
    {
      name: 'controls',
      title: 'Action',
      className: 'job-controls',
      formatter: formatAction,
      width: 100,
    },
  ];

  useEffect(() => {
    const handlePubSub = (topic: string, message: any) => {
      if (topic !== 'job_progress') return;
      setJobs((prevData) => {
        const index = prevData.findIndex((job) => job.id === message.id);
        if (index === -1) return prevData;

        const newData = [...prevData];
        newData[index] = {
          ...newData[index],
          status: message.status,
          progress: message.progress,
          message: message.message,
        };
        return newData;
      });
    }; // handlePubSub

    const unsubscribe = ws.subscribe('job_progress', handlePubSub);
    return () => unsubscribe();
  }, [ws]);

  return (
    <main className="column">
      <JobsNav searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <Section className="grow">
        <Table columns={COLUMNS} className="contained" data={jobs} loading={loading} />
      </Section>
    </main>
  );
};

export default JobsPage;
