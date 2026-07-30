import {
  Spacer,
  Select,
  RadioButton,
  Button,
  InputText,
  Form,
  FormRow,
  Section,
} from '@components';
import { Navbar } from '@components';
import { useNebula } from '@features/Nebula';
import React, { useMemo, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import styled from 'styled-components';

import type { PlayoutPluginManifest, PlayoutPluginSlot } from '../../client';

import nebula from '@/nebula';

const PluginFormWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  > div {
    display: flex;
    flex-direction: row;
    gap: 4px;
  }
`;

interface PluginSlotProps {
  slot: PlayoutPluginSlot;
  value: any;
  onChange: (value: any) => void;
}

const PluginSlot: React.FC<PluginSlotProps> = ({ slot, value, onChange }) => {
  if (slot.type === 'text') {
    return <InputText value={value} onChange={onChange} style={{ flexGrow: 1 }} />;
  }

  if (slot.type === 'select') {
    return (
      <Select
        value={value}
        onChange={onChange}
        options={
          slot.options?.map((opt) => ({
            title: opt.title || opt.value,
            value: opt.value,
          })) || []
        }
      />
    );
  }

  return <span>Unsupported slot type: {slot.type}</span>;
};

interface PluginPanelProps {
  plugin?: PlayoutPluginManifest | null;
  onError: (error: any) => void;
}

const PluginPanel: React.FC<PluginPanelProps> = ({ plugin, onError }) => {
  const { currentChannelId } = useNebula();
  const [formData, setFormData] = useState<Record<string, any>>({});

  if (!plugin) {
    return <div>No plugin selected</div>;
  }

  const buttons = (
    <>
      {plugin.slots
        ?.filter((slot) => slot.type === 'action')
        .map((slot) => (
          <Button
            key={slot.name}
            label={slot.name}
            onClick={() => {
              if (currentChannelId === null) return;
              nebula
                .playout({
                  body: {
                    action: 'plugin_exec',
                    id_channel: currentChannelId,
                    payload: {
                      name: plugin.name,
                      action: slot.name,
                      data: formData,
                    },
                  },
                  throwOnError: true,
                })
                .then(() => {
                  toast.info(`Action ${slot.name} executed successfully`);
                })
                .catch(onError);
            }}
          />
        ))}
    </>
  );

  if (!plugin.slots?.length) {
    return <div>No interactivity available</div>;
  }

  if (!plugin.slots.filter((slot) => slot.type !== 'action').length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>{buttons}</div>
    );
  }

  return (
    <>
      <Form>
        {plugin.slots
          .filter((slot) => slot.type !== 'action')
          .map((slot) => (
            <FormRow key={slot.name} title={slot.name}>
              <PluginSlot
                slot={slot}
                value={formData[slot.name]}
                onChange={(val) => { setFormData((o) => ({ ...o, [slot.name]: val })); }}
              />
            </FormRow>
          ))}
        <FormRow title="">
          <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
            {buttons}
          </div>
        </FormRow>
      </Form>
    </>
  );
};

interface PlayoutPluginsProps {
  onError: (error: any) => void;
}

const PlayoutPlugins: React.FC<PlayoutPluginsProps> = ({ onError }) => {
  const { currentChannelId } = useNebula();
  const [pluginList, setPluginList] = useState<PlayoutPluginManifest[]>([]);
  const [currentPlugin, setCurrentPlugin] = useState<string | null>(null);

  useEffect(() => {
    if (currentChannelId === null) return;
    nebula
      .playout({
        body: { id_channel: currentChannelId, action: 'plugin_list' },
        throwOnError: true,
      })
      .then((res) => {
        const plugins = res.data.plugins || [];
        setPluginList(plugins);
        if (plugins.length > 0) {
          setCurrentPlugin(plugins[0].name);
        }
      })
      .catch(onError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChannelId]);

  const pluginOptions = useMemo(() => {
    return pluginList
      .filter((plugin) => plugin?.slots?.length)
      .map((plugin) => ({
        title: plugin.title || plugin.name,
        value: plugin.name,
      }));
  }, [pluginList]);

  return (
    <PluginFormWrapper>
      <Navbar>
        <RadioButton
          options={pluginOptions}
          value={currentPlugin || ''}
          onChange={setCurrentPlugin}
        />
        <Spacer />
      </Navbar>
      <Section style={{ flexDirection: 'column', display: 'flex', gap: '6px' }}>
        <PluginPanel
          onError={onError}
          plugin={
            pluginList?.length && currentPlugin
              ? pluginList.find((p) => p.name === currentPlugin)
              : null
          }
        />
      </Section>
    </PluginFormWrapper>
  );
};

export default PlayoutPlugins;
