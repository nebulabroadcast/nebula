import {
  Button,
  Icon,
  InputText,
  InputPassword,
  PanelHeader,
  Form,
  FormRow,
  InputSwitch,
  ScrollBox,
  Section,
} from '@components';
import React from 'react';
import { toast } from 'react-toastify';

import type { UserModel } from '../../../client';

import AccessControl from './AccessControl';
import ApiKeyPicker from './ApiKeyPicker';

import nebula from '@/nebula';

const apiKeyPreview = (apiKey: string) => {
  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 4);
  return start + '*******' + end;
};

interface UserFormProps {
  userData: Partial<UserModel> & { api_key_preview?: string };
  setUserData: React.Dispatch<React.SetStateAction<Partial<UserModel>>>;
}

const UserForm: React.FC<UserFormProps> = ({ userData, setUserData }) => {
  const setValue = (key: string, value: any) => {
    setUserData((prev) => ({ ...prev, [key]: value }));
  };

  const sendInviteEmail = () => {
    if (!userData?.email || !userData?.id) return;
    nebula
      .request('send-invitation-email', { id: userData.id })
      .then(() => {
        toast.success('Invite email sent');
      })
      .catch(() => {
        toast.error('Failed to send invite email');
      });
  };

  return (
    <ScrollBox style={{ minWidth: 600 }}>
      <Section className="column">
        <PanelHeader>
          <Icon icon="person" />
          {userData?.id ? 'User profile' : 'New user'}
        </PanelHeader>
        <Form>
          <FormRow title="Login">
            <InputText
              value={userData?.login || ''}
              disabled={!!userData?.id}
              onChange={(value) => { setValue('login', value); }}
            />
          </FormRow>
          <FormRow title="Full name">
            <InputText
              value={userData?.full_name || ''}
              onChange={(value) => { setValue('full_name', value); }}
            />
          </FormRow>
          <FormRow title="Email">
            <InputText
              value={userData?.email || ''}
              onChange={(value) => { setValue('email', value); }}
            />
            <Button
              label="Send invite email"
              icon="email"
              disabled={!userData?.email || !userData?.id}
              style={{ maxWidth: 150 }}
              onClick={() => {
                sendInviteEmail();
              }}
            />
          </FormRow>
        </Form>
      </Section>

      <Section className="column">
        <PanelHeader>
          <Icon icon="security" />
          Authentication
        </PanelHeader>

        <Form>
          <FormRow title="Password">
            <InputPassword
              value={userData?.password || ''}
              onChange={(value) => { setValue('password', value); }}
              autoComplete="new-password"
              placeholder="Change current password"
            />
          </FormRow>
          <FormRow title="API Key">
            <ApiKeyPicker
              setApiKey={(value) => {
                setValue('api_key', value);
                setValue('api_key_preview', apiKeyPreview(value));
              }}
              apiKeyPreview={userData?.api_key_preview}
            />
          </FormRow>
          <FormRow title="Local network only">
            <InputSwitch
              value={userData?.local_network_only || false}
              onChange={(value) => { setValue('local_network_only', value); }}
            />
          </FormRow>
        </Form>
      </Section>

      <Section className="column">
        <PanelHeader>
          <Icon icon="lock" />
          Access control
        </PanelHeader>
        <AccessControl userData={userData} setValue={setValue} />
      </Section>
    </ScrollBox>
  );
};

export default UserForm;
