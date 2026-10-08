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

import AccessControl from './AccessControl';
import ApiKeyPicker from './ApiKeyPicker';
import UserAvatar from './UserAvatar';
import type { UserDraft } from './Users';

import nebula from '@/nebula';

interface UserFormProps {
  userData: UserDraft;
  setUserData: React.Dispatch<React.SetStateAction<UserDraft>>;
  // Called after changes saved right away (API key, avatar)
  onChanged: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ userData, setUserData, onChanged }) => {
  const setValue = (key: string, value: any) => {
    setUserData((prev) => ({ ...prev, [key]: value }));
  };

  const sendInviteEmail = () => {
    if (!userData?.email || !userData?.id) return;
    nebula
      .sendInvitationEmail({ body: { id: userData.id }, throwOnError: true })
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
        <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
          <Form style={{ flexGrow: 1 }}>
            <FormRow title="Login">
              <InputText
                value={userData?.login || ''}
                disabled={!!userData?.id}
                onChange={(value) => {
                  setValue('login', value);
                }}
              />
            </FormRow>
            <FormRow title="Full name">
              <InputText
                value={userData?.full_name || ''}
                onChange={(value) => {
                  setValue('full_name', value);
                }}
              />
            </FormRow>
            <FormRow title="Email">
              <InputText
                value={userData?.email || ''}
                onChange={(value) => {
                  setValue('email', value);
                }}
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
          <UserAvatar userId={userData?.id ?? undefined} />
        </div>
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
              onChange={(value) => {
                setValue('password', value);
              }}
              autoComplete="new-password"
              placeholder={
                userData?.has_password ? 'Change current password' : 'Set a password'
              }
            />
          </FormRow>
          <FormRow title="API Key">
            <ApiKeyPicker
              userId={userData?.id ?? undefined}
              apiKeyPreview={userData?.api_key_preview ?? undefined}
              onCreated={onChanged}
            />
          </FormRow>
          <FormRow title="Local network only">
            <InputSwitch
              value={userData?.local_network_only || false}
              onChange={(value) => {
                setValue('local_network_only', value);
              }}
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
