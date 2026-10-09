import Sessions from '@containers/Sessions';
import { ApiKeyPicker } from '@features/ApiKeyPicker';
import { useNebula } from '@features/Nebula';
import { UserAvatar } from '@features/UserAvatar';
import { getErrorDetail } from '@lib/utils';
import clsx from 'clsx';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

import {
  Form,
  FormRow,
  Icon,
  InputText,
  InputPassword,
  Button,
  PanelHeader,
  Section,
} from '@/components';
import nebula from '@/nebula';

import './ProfilePage.css';

const ProfileForm: React.FC = () => {
  const user = nebula.user;
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  if (!user) return null;

  const changed = fullName !== (user.full_name || '') || email !== (user.email || '');

  const saveProfile = () => {
    const userId = user.id;
    if (!userId) return;
    setSaving(true);
    nebula
      .usersUpdate({
        path: { user_id: userId },
        body: { full_name: fullName || null, email: email || null },
        throwOnError: true,
      })
      .then((res) => {
        // nebula.user comes from init; keep it in sync with the saved profile
        Object.assign(user, {
          full_name: res.data.full_name,
          email: res.data.email,
        });
        setFullName(res.data.full_name || '');
        setEmail(res.data.email || '');
        toast.success('Profile saved');
      })
      .catch((err: unknown) => {
        toast.error(`Unable to save profile: ${getErrorDetail(err)}`);
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <Section className={clsx('column', changed && 'section-changed')}>
      <PanelHeader>
        <Icon icon="person" />
        {user.full_name || user.login}
      </PanelHeader>
      <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
        <UserAvatar userId={user.id ?? undefined} />
        <Form style={{ flexGrow: 1 }}>
          <FormRow title="Login">
            <InputText
              value={user.login}
              disabled
              onChange={() => {
                // read-only field
              }}
            />
          </FormRow>
          <FormRow title="Full name">
            <InputText value={fullName} onChange={setFullName} />
          </FormRow>
          <FormRow title="Email">
            <InputText value={email} onChange={setEmail} />
          </FormRow>
        </Form>
      </div>
      <div className="section-actions">
        <Button
          label="Save"
          icon="check"
          disabled={!changed || saving}
          onClick={saveProfile}
        />
      </div>
    </Section>
  );
};

const ChangePasswordForm: React.FC = () => {
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');

  const changePassword = () => {
    if (password !== passwordRepeat) {
      toast.error('Passwords do not match');
      return;
    }

    if (!nebula.user?.id) return;
    nebula
      .usersSetPassword({
        path: { user_id: nebula.user.id },
        body: { password },
        throwOnError: true,
      })
      .then(() => {
        toast.success('Password changed');
        setPassword('');
        setPasswordRepeat('');
      })
      .catch((err: unknown) => {
        toast.error(
          getErrorDetail(err, err instanceof Error ? err.message : undefined)
        );
      });
  };

  return (
    <Section className="column">
      <PanelHeader>
        <Icon icon="security" />
        Change password
      </PanelHeader>
      <Form>
        <FormRow title="New password">
          <InputPassword
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
        </FormRow>
        <FormRow title="Confirm password">
          <InputPassword
            value={passwordRepeat}
            onChange={setPasswordRepeat}
            autoComplete="new-password"
          />
        </FormRow>
      </Form>
      <div className="section-actions">
        <Button
          label="Change password"
          icon="check"
          disabled={!password}
          onClick={changePassword}
        />
      </div>
    </Section>
  );
};

const ApiKeyForm: React.FC = () => {
  const userId = nebula.user?.id;
  const [preview, setPreview] = useState<string | undefined>();

  useEffect(() => {
    if (!userId) return;
    nebula
      .usersGet({
        path: { user_id: userId },
        query: { fields: 'api_key_preview' },
        throwOnError: true,
      })
      .then((res) => {
        setPreview(res.data.api_key_preview ?? undefined);
      })
      .catch((err: unknown) => {
        toast.error(`Unable to load API key: ${getErrorDetail(err)}`);
      });
  }, [userId]);

  return (
    <Section className="column">
      <PanelHeader>
        <Icon icon="key" />
        API key
      </PanelHeader>
      <div className="row">
        <ApiKeyPicker userId={userId ?? undefined} apiKeyPreview={preview} />
      </div>
      <div className="section-hint">Creating a new key revokes the current one.</div>
    </Section>
  );
};

const ProfilePage: React.FC = () => {
  const { setPageTitle } = useNebula();
  useEffect(() => {
    setPageTitle('User profile');
  }, [setPageTitle]);

  if (!nebula.user) return null;

  return (
    <main className="profile-page">
      <div className="column">
        <ProfileForm />
        <ChangePasswordForm />
        <ApiKeyForm />
      </div>

      <Sessions userId={nebula.user.id} />
    </main>
  );
};

export default ProfilePage;
