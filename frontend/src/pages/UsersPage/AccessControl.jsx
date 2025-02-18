import nebula from '/src/nebula';
import { useState, useEffect, useMemo } from 'react';

import { Icon, Select, InputSwitch, PanelHeader, Form, FormRow } from '/src/components';

const AllOrList = ({ value, setValue, options, disabled }) => {
  const [all, setAll] = useState(false);
  const [values, setValues] = useState([]);

  useEffect(() => {
    if (value === true) {
      setAll(true);
    } else if (value === false) {
      setAll(false);
      setValues([]);
    } else {
      setAll(false);
      setValues(value);
    }
  }, [value]);

  return (
    <div className="row" style={{ flexGrow: 1, gap: 12, alignItems: 'center' }}>
      <Select
        options={options}
        value={values}
        onChange={(v) => {
          const m = v.map((i) => parseInt(i));
          setValues(m);
          setValue(m.length === 0 ? false : m);
        }}
        disabled={all || disabled}
        selectionMode="multiple"
        style={{ flexGrow: 1 }}
      />
      All
      <InputSwitch
        value={all}
        onChange={(v) => {
          setAll(v);
          setValue(v ? true : values);
        }}
        title="All"
        disabled={disabled}
      />
    </div>
  );
};

const AccessControl = ({ userData, setValue }) => {
  const folderOptions = useMemo(() => {
    return nebula.settings.folders.map((folder) => ({
      title: folder.name,
      value: folder.id,
    }));
  }, []);

  const channelOptions = useMemo(() => {
    return nebula.settings.playout_channels.map((channel) => ({
      title: channel.name,
      value: channel.id,
    }));
  }, []);

  const isAdmin = userData?.is_admin || false;

  return (
    <Form>
      <FormRow title="Administrator">
        <InputSwitch
          value={userData?.is_admin || false}
          onChange={(value) => setValue('is_admin', value)}
        />
      </FormRow>
      <FormRow title="Limited">
        <InputSwitch
          value={userData?.is_limited || false}
          onChange={(value) => setValue('is_limited', value)}
          disabled={isAdmin}
        />
      </FormRow>
      <FormRow title="Asset view">
        <AllOrList
          value={userData?.can_asset_view || false}
          setValue={(value) => setValue('can_asset_view', value)}
          options={folderOptions}
          disabled={isAdmin}
        />
      </FormRow>
      <FormRow title="Asset edit">
        <AllOrList
          value={userData?.can_asset_edit || false}
          setValue={(value) => setValue('can_asset_edit', value)}
          options={folderOptions}
          disabled={isAdmin}
        />
      </FormRow>
      <FormRow title="Scheduler view">
        <AllOrList
          value={userData?.can_scheduler_view || false}
          setValue={(value) => setValue('can_scheduler_view', value)}
          options={channelOptions}
          disabled={isAdmin}
        />
      </FormRow>
      <FormRow title="Scheduler edit">
        <AllOrList
          value={userData?.can_scheduler_edit || false}
          setValue={(value) => setValue('can_scheduler_edit', value)}
          options={channelOptions}
          disabled={isAdmin}
        />
      </FormRow>
      <FormRow title="Rundown view">
        <AllOrList
          value={userData?.can_rundown_view || false}
          setValue={(value) => setValue('can_rundown_view', value)}
          options={channelOptions}
          disabled={isAdmin}
        />
      </FormRow>
      <FormRow title="Rundown edit">
        <AllOrList
          value={userData?.can_rundown_edit || false}
          setValue={(value) => setValue('can_rundown_edit', value)}
          options={channelOptions}
          disabled={isAdmin}
        />
      </FormRow>
      <FormRow title="Playout control">
        <AllOrList
          value={userData?.can_mcr || false}
          setValue={(value) => setValue('can_mcr', value)}
          options={channelOptions}
          disabled={isAdmin}
        />
      </FormRow>
      <FormRow title="Jobs control">
        <InputSwitch
          value={userData?.can_job_control || false}
          onChange={(value) => setValue('can_job_control', value)}
          disabled={isAdmin}
        />
      </FormRow>
      <FormRow title="Services control">
        <InputSwitch
          value={userData?.can_service_control || false}
          onChange={(value) => setValue('can_service_control', value)}
          disabled={isAdmin}
        />
      </FormRow>
    </Form>
  );
};

export default AccessControl;
