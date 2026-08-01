import { Form, FormRow, InputSwitch } from '@components';
import { Section, Spacer } from '@components';
import { useNebula } from '@features/Nebula';
import { useLocalStorage } from '@lib/useLocalStorage';
import { useState, useEffect } from 'react';

import { formatBytes } from './common';
import type { StorageStats } from './common';
import { Availability, StorageName, StorageHeader, Sizes } from './Storages.styled';
import StorageVisualization from './StorageVisualization';

import nebula from '@/nebula';

interface StorageRowProps {
  storage: StorageStats;
  showUntracked: boolean;
  showFree: boolean;
}

const StorageRow = ({ storage, showUntracked, showFree }: StorageRowProps) => {
  const usedPercent = storage.used / storage.total;

  return (
    <Section className="column">
      <StorageName>{storage.label}</StorageName>
      <StorageHeader>
        <Availability available={storage.available}>
          {storage.available ? 'Available' : 'Offline'}
        </Availability>
        <Sizes>
          {formatBytes(storage.used)} / {formatBytes(storage.total)} (
          {(usedPercent * 100).toFixed(1)}%)
        </Sizes>
      </StorageHeader>
      {storage.available && (
        <StorageVisualization
          storage={storage}
          showFree={showFree}
          showUntracked={showUntracked}
        />
      )}
    </Section>
  );
};

interface StoragesData {
  storages: StorageStats[];
}

const StoragesPage = () => {
  const [data, setData] = useState<StoragesData>({ storages: [] });
  const { setPageTitle } = useNebula();

  const [showUntracked, setShowUntracked] = useLocalStorage(
    'system.storages.showUntracked',
    false
  );
  const [showFree, setShowFree] = useLocalStorage('system.storages.showFree', true);

  useEffect(() => {
    setPageTitle('Storages');
    void nebula.statsStorages({ throwOnError: true }).then((response) => {
      setData(response.data as StoragesData);
      console.log(response.data);
    });
  }, [setPageTitle]);

  return (
    <Section className="transparent row grow">
      <Section className="column">
        <Form style={{ minWidth: '200px' }}>
          <FormRow title="Show untracked files">
            <InputSwitch value={showUntracked} onChange={setShowUntracked} />
          </FormRow>
          <FormRow title="Show free space">
            <InputSwitch value={showFree} onChange={setShowFree} />
          </FormRow>
        </Form>
        <Spacer />
      </Section>

      <Section className="transparent column grow">
        {data.storages.map((s) => (
          <StorageRow
            key={s.storage_id}
            storage={s}
            showUntracked={showUntracked}
            showFree={showFree}
          />
        ))}
      </Section>
    </Section>
  );
};

export default StoragesPage;
