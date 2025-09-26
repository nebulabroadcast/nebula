import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import nebula from '/src/nebula';
import { Section, Spacer } from '/src/components';
import { setPageTitle } from '/src/actions';
import { formatBytes } from './common';
import StorageVisualization from './StorageVisualization';

const Availability = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 0.9rem;
  margin-top: 0.3rem;

  &::before {
    content: '';
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${(p) => (p.available ? '#4caf50' : '#f44336')};
    margin-right: 0.5rem;
  }
`;

const StorageHeader = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 24px;

  h3 {
    margin: 0;
    font-size: 1.5rem;
  }
`;

const Sizes = styled.div`
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #aaa;
`;

const StorageRow = ({ storage }) => {
  const usedPercent = storage.used / storage.total;

  return (
    <Section className="column">
      <StorageHeader>
        <h3>{storage.label}</h3>
        <Sizes>
          {formatBytes(storage.used)} / {formatBytes(storage.total)} (
          {(usedPercent * 100).toFixed(1)}%)
        </Sizes>
        <Spacer />
        <Availability available={storage.available}>
          {storage.available ? 'Available' : 'Offline'}
        </Availability>
      </StorageHeader>
      <StorageVisualization storage={storage} />
    </Section>
  );
};

const StoragesPage = () => {
  const [data, setData] = useState({ storages: [] });
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setPageTitle({ title: 'Storages' }));
    nebula.request('stats/storages').then((response) => {
      setData(response.data);
    });
  }, []);

  return (
    <Section className="transparent column">
      {data.storages.map((s) => (
        <StorageRow key={s.storage_id} storage={s} />
      ))}
    </Section>
  );
};

export default StoragesPage;
