import nebula from '@/nebula';
import React, { useMemo } from 'react';

import { Select, InputSwitch, Form, FormRow } from '@components';
import type { UserModel, UserPermissionsModel } from '../../../client';

interface AllOrListProps {
  value: boolean | number[];
  setValue: (value: boolean | number[]) => void;
  options: { title: string; value: number }[];
  disabled?: boolean;
}

const AllOrList: React.FC<AllOrListProps> = ({
  value,
  setValue,
  options,
  disabled,
}) => {
  const all = value === true;
  const values = Array.isArray(value) ? (value as number[]) : [];

  const stringOptions = useMemo(
    () => options.map((o) => ({ title: o.title, value: o.value.toString() })),
    [options]
  );
  const stringValues = useMemo(() => values.map((v) => v.toString()), [values]);

  return (
    <div className="row" style={{ flexGrow: 1, gap: 12, alignItems: 'center' }}>
      <Select
        options={stringOptions}
        value={stringValues}
        onChange={(v) => {
          const m = (Array.isArray(v) ? v : [v]).map((i) => parseInt(i));
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
          setValue(v ? true : values);
        }}
        disabled={disabled}
      />
    </div>
  );
};

interface AccessControlProps {
  userData: Partial<UserModel>;
  setValue: (key: string, value: any) => void;
}

const AccessControl: React.FC<AccessControlProps> = ({ userData, setValue }) => {
  const permissions = userData?.permissions || {};

  const folderOptions = useMemo(() => {
    return (nebula.settings?.folders || []).map((folder) => ({
      title: folder.name,
      value: folder.id,
    }));
  }, []);

  const channelOptions = useMemo(() => {
    return (nebula.settings?.playout_channels || []).map((channel) => ({
      title: channel.name,
      value: channel.id,
    }));
  }, []);

  const setPermission = (key: keyof UserPermissionsModel, value: any) => {
    setValue('permissions', { ...permissions, [key]: value });
  };

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
          value={permissions.asset_view || false}
          setValue={(value) => setPermission('asset_view', value)}
          options={folderOptions}
          disabled={isAdmin}
        />
      </FormRow>
      <FormRow title="Asset edit">
        <AllOrList
          value={permissions.asset_edit || false}
          setValue={(value) => setPermission('asset_edit', value)}
          options={folderOptions}
          disabled={isAdmin}
        />
      </FormRow>
      <FormRow title="Scheduler view">
        <AllOrList
          value={permissions.scheduler_view || false}
          setValue={(value) => setPermission('scheduler_view', value)}
          options={channelOptions}
          disabled={isAdmin}
        />
      </FormRow>
      <FormRow title="Scheduler edit">
        <AllOrList
          value={permissions.scheduler_edit || false}
          setValue={(value) => setPermission('scheduler_edit', value)}
          options={channelOptions}
          disabled={isAdmin}
        />
      </FormRow>
      <FormRow title="Rundown view">
        <AllOrList
          value={permissions.rundown_view || false}
          setValue={(value) => setPermission('rundown_view', value)}
          options={channelOptions}
          disabled={isAdmin}
        />
      </FormRow>
      <FormRow title="Rundown edit">
        <AllOrList
          value={permissions.rundown_edit || false}
          setValue={(value) => setPermission('rundown_edit', value)}
          options={channelOptions}
          disabled={isAdmin}
        />
      </FormRow>
      <FormRow title="Playout control">
        <AllOrList
          value={permissions.mcr || false}
          setValue={(value) => setPermission('mcr', value)}
          options={channelOptions}
          disabled={isAdmin}
        />
      </FormRow>
      <FormRow title="Jobs control">
        <InputSwitch
          value={(permissions.job_control as boolean) || false}
          onChange={(value) => setPermission('job_control', value)}
          disabled={isAdmin}
        />
      </FormRow>
      <FormRow title="Services control">
        <InputSwitch
          value={(userData as any)?.can_service_control || false}
          onChange={(value) => setValue('can_service_control', value)}
          disabled={isAdmin}
        />
      </FormRow>
    </Form>
  );
};

export default AccessControl;
