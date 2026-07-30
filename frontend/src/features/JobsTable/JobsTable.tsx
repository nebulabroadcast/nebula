import { Table, Button } from '@components';
import { useWebSocket } from '@features/Websocket';
import formatMetaDatetime from '@lib/tableFormat/formatMetaDatetime';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NavLink } from 'react-router';

import type { JobListItem, JobState, ManageJobsRequest } from '@/client';
import nebula from '@/nebula';

const NOT_RESTARTABLE = ['import'];

const formatTitle = (rowData: Record<string, any>, key: string) => {
  const row = rowData as JobListItem;
  const val = row[key as keyof JobListItem] as React.ReactNode;
  return (
    <td>
      <NavLink to={`/mam/editor?asset=${row.id_asset}`}>{val}</NavLink>
    </td>
  );
};

export interface JobsTableProps {
  view?: string;
  searchQuery?: string;
  assetId?: number | string;
  hideColumns?: string[];
  className?: string;
  style?: React.CSSProperties;
}

interface WebSocketJobProgressMessage {
  id: number;
  status: JobState;
  progress: number;
  message?: string;
  id_asset?: number;
}

export const JobsTable: React.FC<JobsTableProps> = ({
  view,
  searchQuery,
  assetId,
  hideColumns,
  className,
  style,
}) => {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const ws = useWebSocket();

  const effectiveView = assetId !== undefined ? view || 'all' : view;

  const loadJobs = useCallback(() => {
    setLoading(true);
    const params: ManageJobsRequest = {
      view: effectiveView as ManageJobsRequest['view'],
      search_query: searchQuery,
    };
    if (assetId !== undefined) {
      params.asset_ids = [Number(assetId)];
    }
    nebula
      .jobs({ body: params, throwOnError: true })
      .then((response) => {
        setJobs(response.data.jobs || []);
      })
      .catch((err: unknown) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [effectiveView, searchQuery, assetId]);

  const jobsStatusKey = jobs.map((job) => job.status).join(',');

  useEffect(() => {
    loadJobs();
  }, [jobsStatusKey, effectiveView, searchQuery, assetId, loadJobs]);

  const restartJob = (id: number) => {
    void nebula.jobs({ body: { restart: id }, throwOnError: true }).then(() => {
      loadJobs();
    });
  };

  const abortJob = (id: number) => {
    void nebula.jobs({ body: { abort: id }, throwOnError: true }).then(() => {
      loadJobs();
    });
  };

  const formatAction = (rowData: Record<string, any>) => {
    const row = rowData as JobListItem;
    if ([0, 1, 5].includes(row.status)) {
      return (
        <td className="action">
          <Button
            onClick={() => {
              abortJob(row.id);
            }}
            label="Abort"
          />
        </td>
      );
    } else if ([2, 3, 4, 6].includes(row.status)) {
      return (
        <td className="action">
          <Button
            onClick={() => {
              restartJob(row.id);
            }}
            disabled={row.service_type ? NOT_RESTARTABLE.includes(row.service_type) : false}
            label="Restart"
          />
        </td>
      );
    } else {
      return <td className="action">-</td>;
    }
  };

  const formatPriority = (rowData: Record<string, any>, key: string) => {
    const row = rowData as JobListItem;
    const enabled = [0, 5].includes(row.status);

    const setPriority = (priority: number) => {
      void nebula
        .jobs({ body: { priority: [row.id, priority] }, throwOnError: true })
        .then(() => {
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

    const currentPriority = (row[key as keyof JobListItem] as number) || 0;

    return (
      <td
        onClick={() => {
          setPriority((currentPriority + 1) % 6);
        }}
      >
        <span
          style={{
            color: PRIORITIES[currentPriority]?.color || 'inherit',
            fontSize: '0.8rem',
            userSelect: 'none',
          }}
        >
          {PRIORITIES[currentPriority]?.label || ''}
        </span>
      </td>
    );
  };

  const formatMessage = (rowData: Record<string, any>, key: string) => {
    const row = rowData as JobListItem;
    const msg = (row[key as keyof JobListItem] as string) || '';
    return (
      <td className="job-message" title={msg}>
        {msg}
      </td>
    );
  };

  const allColumns = useMemo(
    () => [
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
      {
        name: 'message',
        title: 'Message',
        className: 'job-message',
        formatter: formatMessage,
        width: 400,
      },
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
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const activeHideColumns = useMemo(() => {
    if (hideColumns !== undefined) return hideColumns;
    if (assetId !== undefined) return ['asset_name', 'id'];
    return [];
  }, [hideColumns, assetId]);

  const columns = useMemo(() => {
    return allColumns.filter((col) => !activeHideColumns.includes(col.name));
  }, [allColumns, activeHideColumns]);

  useEffect(() => {
    const handlePubSub = (topic: string, messageData: unknown) => {
      if (topic !== 'job_progress') return;
      const message = messageData as WebSocketJobProgressMessage;
      setJobs((prevData) => {
        const index = prevData.findIndex((job) => job.id === message.id);
        if (index === -1) {
          if (assetId === undefined || message.id_asset === Number(assetId)) {
            loadJobs();
          }
          return prevData;
        }

        const newData = [...prevData];
        newData[index] = {
          ...newData[index],
          status: message.status,
          progress: message.progress,
          message: message.message,
        };
        return newData;
      });
    };

    const unsubscribe = ws.subscribe('job_progress', handlePubSub);
    return () => {
      unsubscribe();
    };
  }, [ws, assetId, loadJobs]);

  return (
    <Table
      columns={columns}
      className={className}
      style={style}
      data={jobs}
      loading={loading}
    />
  );
};

export default JobsTable;
