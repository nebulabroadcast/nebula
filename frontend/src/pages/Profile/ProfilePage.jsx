import nebula from '/src/nebula';

import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { setPageTitle } from '/src/actions';

import {
  Form,
  FormRow,
  Icon,
  InputText,
  InputPassword,
  Button,
  PanelHeader,
  Section,
} from '/src/components';
import Sessions from '/src/containers/Sessions.jsx';

const ProfileForm = () => {
  const displayName = nebula.user.full_name || nebula.user.login;

  return (
    <Section className="column">
      <PanelHeader>
        <Icon icon="person" />
        {displayName}
      </PanelHeader>
      <Form>
        <FormRow title="Login">
          <InputText value={nebula.user.login} disabled />
        </FormRow>
        <FormRow title="Full name">
          <InputText value={nebula.user.full_name} disabled />
        </FormRow>
        <FormRow title="Email">
          <InputText value={nebula.user.email} disabled />
        </FormRow>
        <FormRow>
          <Button label="Save" icon="check" disabled />
        </FormRow>
      </Form>
    </Section>
  );
};

const ChangePasswordForm = () => {
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');

  const changePassword = () => {
    if (password !== passwordRepeat) {
      toast.error('Passwords do not match');
      return;
    }

    nebula
      .request('password', { password })
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
          <InputText
            type="password"
            value={passwordRepeat}
            onChange={setPasswordRepeat}
          />
        </FormRow>
        <FormRow>
          <Button label="Change password" icon="check" onClick={changePassword} />
        </FormRow>
      </Form>
    </Section>
  );
};


const ProfilePage = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setPageTitle({ title: "User profile" }));
  }, []);

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
