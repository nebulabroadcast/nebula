import { toast } from 'react-toastify';
import styled from 'styled-components';
import { useMemo, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import nebula from '/src/nebula';
import {
  Spacer,
  Select,
  RadioButton,
  Button,
  InputText,
  Form,
  FormRow,
  Section,
} from '/src/components';
import { Navbar } from '/src/components';

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

const PluginSlot = ({ slot, value, onChange }) => {
  if (slot.type === 'text') {
    return (
      <InputText
        label={slot.name}
        value={value}
        onChange={onChange}
        style={{ flexGrow: 1 }}
      />
    );
  }

  if (slot.type === 'select') {
    return <Select value={value} onChange={onChange} options={slot.options} />;
  }

  return <span>Unsupported slot type: {slot.type}</span>;
};

const PluginPanel = ({ plugin, onError }) => {
  const currentChannel = useSelector((state) => state.context.currentChannel);
  const [formData, setFormData] = useState({});

  if (!plugin) {
    return <div>No plugin selected</div>;
  }

  const buttons = (
    <>
      {plugin.slots
        .filter((slot) => slot.type === 'action')
        .map((slot) => (
          <Button
            key={slot.name}
            label={slot.name}
            onClick={() =>
              nebula
                .request('playout', {
                  action: 'plugin_exec',
                  id_channel: currentChannel,
                  payload: {
                    name: plugin.name,
                    action: slot.name,
                    data: formData,
                  },
                })
                .then(() => {
                  toast.info(`Action ${slot.name} executed successfully`);
                })
                .catch(onError)
            }
          />
        ))}
    </>
  );

  if (!plugin.slots.length) {
    return <div>No interacitivity available</div>;
  }

  const inputWidgetCount = plugin.slots.filter((slot) => slot.type !== 'action').length;
  const buttonCount = plugin.slots.filter((slot) => slot.type === 'action').length;

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
                onChange={(val) => setFormData((o) => ({ ...o, [slot.name]: val }))}
              />
            </FormRow>
          ))}
        <FormRow title="Actions">
          <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
            {buttons}
          </div>
        </FormRow>
      </Form>
    </>
  );
};

const PlayoutPlugins = ({ onError }) => {
  const currentChannel = useSelector((state) => state.context.currentChannel);
  const [pluginList, setPluginList] = useState([]);
  const [currentPlugin, setCurrentPlugin] = useState(null);

  useEffect(() => {
    nebula
      .request('playout', {
        id_channel: currentChannel,
        action: 'plugin_list',
      })
      .then((res) => {
        setPluginList(res.data.plugins || []);
        if (res.data.plugins.length > 0) {
          setCurrentPlugin(res.data.plugins[0].name);
        }
      })
      .catch(onError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChannel]);

  const pluginOptions = useMemo(() => {
    return pluginList
      .filter((plugin) => plugin?.slots.length)
      .map((plugin) => ({
        label: plugin.title,
        value: plugin.name,
      }));
  }, [pluginList]);

  return (
    <PluginFormWrapper>
      <Navbar>
        <RadioButton
          options={pluginOptions}
          value={currentPlugin}
          onChange={setCurrentPlugin}
        />
        <Spacer />
      </Navbar>
      <Section style={{ flexDirection: 'column', display: 'flex', gap: '6px' }}>
        <PluginPanel
          onError={onError}
          plugin={
            pluginList?.length &&
            currentPlugin &&
            pluginList.find((p) => p.name === currentPlugin)
          } // Find the plugin object based on the currentPlugin name
        />
      </Section>
    </PluginFormWrapper>
  );
};

export default PlayoutPlugins;
