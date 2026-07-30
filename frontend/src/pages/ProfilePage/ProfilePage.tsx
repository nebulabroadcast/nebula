import Sessions from '@containers/Sessions';
import { useNebula } from '@features/Nebula';
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

const ProfileForm: React.FC = () => {
  const user = nebula.user;
  if (!user) return null;

  const displayName = user.full_name || user.login;

  return (
    <Section className="column">
      <PanelHeader>
        <Icon icon="person" />
        {displayName}
      </PanelHeader>
      <Form>
        <FormRow title="Login">
          <InputText value={user.login} disabled onChange={() => {}} />
        </FormRow>
        <FormRow title="Full name">
          <InputText value={user.full_name || ''} disabled onChange={() => {}} />
        </FormRow>
        <FormRow title="Email">
          <InputText value={user.email || ''} disabled onChange={() => {}} />
        </FormRow>
        <FormRow title="">
          <Button label="Save" icon="check" disabled />
        </FormRow>
      </Form>
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

    nebula
      .password({ body: { password }, throwOnError: true })
      .then(() => {
        toast.success('Password changed');
        setPassword('');
        setPasswordRepeat('');
      })
      .catch((err) => {
        const msg = err.response?.data?.detail || err.message;
        toast.error(msg);
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
        <FormRow title="Repeat new password">
          <InputPassword value={passwordRepeat} onChange={setPasswordRepeat} />
        </FormRow>
        <FormRow title="">
          <Button label="Change password" icon="check" onClick={changePassword} />
        </FormRow>
      </Form>
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
    <main>
      <div className="column" style={{ minWidth: 400 }}>
        <ProfileForm />
        <ChangePasswordForm />
      </div>

      <Sessions userId={nebula.user.id} />
    </main>
  );
};

export default ProfilePage;
