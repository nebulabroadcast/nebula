import {
  Icon,
  InputText,
  InputPassword,
  PanelHeader,
  Form,
  FormRow,
  InputSwitch,
  ScrollBox,
} from '/src/components';

import AccessControl from './AccessControl';
import ApiKeyPicker from './ApiKeyPicker';

const apiKeyPreview = (apiKey) => {
  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 4);
  return start + '*******' + end;
};

const UserForm = ({ userData, setUserData }) => {
  const setValue = (key, value) => {
    setUserData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <ScrollBox style={{ minWidth: 600 }}>
      <section className="column">
        <PanelHeader>
          <Icon icon="person" />
          {userData?.id ? 'User profile' : 'New user'}
        </PanelHeader>
        <Form>
          <FormRow title="Login">
            <InputText
              value={userData?.login || ''}
              disabled={!!userData?.id}
              onChange={(value) => setValue('login', value)}
            />
          </FormRow>
          <FormRow title="Full name">
            <InputText
              value={userData?.full_name || ''}
              onChange={(value) => setValue('full_name', value)}
            />
          </FormRow>
          <FormRow title="Email">
            <InputText
              value={userData?.email || ''}
              onChange={(value) => setValue('email', value)}
            />
          </FormRow>
        </Form>
      </section>

      <section className="column">
        <PanelHeader>
          <Icon icon="security" />
          Authentication
        </PanelHeader>

        <Form>
          <FormRow title="Password">
            <InputPassword
              value={userData?.password || ''}
              onChange={(value) => setValue('password', value)}
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
              onChange={(value) => setValue('local_network_only', value)}
            />
          </FormRow>
        </Form>
      </section>

      <section className="column">
        <PanelHeader>
          <Icon icon="lock" />
          Access control
        </PanelHeader>
        <AccessControl userData={userData} setValue={setValue} />
      </section>
    </ScrollBox>
  );
};

export default UserForm;
