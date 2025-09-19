import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import nebula from '/src/nebula';
import { Section } from '/src/components';
import { setPageTitle } from '/src/actions';
import StorageVisualization from './StorageVisualization';

const Row = styled.section`
  display: flex;
  overflow: hidden;
`;

const Meta = styled.div`
  width: 250px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const Label = styled.h3`
  margin: 0;
  font-size: 1.2rem;
`;

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

const Sizes = styled.div`
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #aaa;
`;


const formatBytes = (bytes) => {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
};

const StorageRow = ({ storage }) => {
  const usedPercent = storage.used / storage.total;

  return (
    <Row>
      <Meta>
        <Label>{storage.label}</Label>
        <Availability available={storage.available}>
          {storage.available ? 'Available' : 'Offline'}
        </Availability>
        <Sizes>
          {formatBytes(storage.used)} / {formatBytes(storage.total)} (
          {(usedPercent * 100).toFixed(1)}%)
        </Sizes>
      </Meta>
      <StorageVisualization storage={storage} />
    </Row>
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
    <Section className="grow column">
      {data.storages.map((s) => (
        <StorageRow key={s.storage_id} storage={s} />
      ))}
    </Section>
  );
};

export default StoragesPage;
