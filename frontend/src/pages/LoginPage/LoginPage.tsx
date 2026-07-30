import { Button, InputText, InputPassword, ButtonLink } from '@components';
import { useState, useEffect, useRef, FormEvent, CSSProperties } from 'react';
import { toast } from 'react-toastify';

import type { SsoOption } from '../../client';
import NebulaLogo from '/src/assets/logo-wide.svg';
import LoadingPage from '../LoadingPage';

import { LoginContainer, LoginForm } from './LoginPage.styled';
import { PasswordReset } from './PasswordReset';

import nebula from '@/nebula';

interface SSOOptionsProps {
  ssoOptions?: SsoOption[];
}

const SSOOptions = ({ ssoOptions }: SSOOptionsProps) => {
  if (ssoOptions?.length === 0) {
    return null;
  }
  return (
    <div
      style={{
        marginTop: 6,
        paddingTop: 12,
        borderTop: '1px solid #a0a0a0',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {(ssoOptions || []).map((option) => (
        <ButtonLink
          key={option.name}
          href={`/api/sso/login/${option.name}`}
          label={option.title}
        />
      ))}
    </div>
  );
};

interface StandardLoginProps {
  onLogin: (token: string) => void;
  onPasswordReset?: () => void;
  ssoOptions?: SsoOption[];
}

const StandardLogin = ({
  onLogin,
  ssoOptions,
  onPasswordReset,
}: StandardLoginProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (usernameRef.current) {
      (usernameRef.current as HTMLInputElement).focus();
    }
  }, []);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    nebula
      .login({ body: { username, password }, throwOnError: true })
      .then((response) => {
        onLogin(response.data.access_token);
      })
      .catch((err) => {
        if (err.response.status === 422) {
          toast.error(
            <div>
              <p>
                <strong>Login failed</strong>
              </p>
              <p>Invalid request</p>
            </div>
          );
          return;
        }

        toast.error(
          <div>
            <strong>Login failed</strong>
            <p>{err.response.data?.detail || 'Unknown error'}</p>
          </div>
        );
      });
  };

  return (
    <LoginForm onSubmit={onSubmit}>
      <div className="logo-container">
        <img src={NebulaLogo} alt="Nebula" />
      </div>
      <InputText
        placeholder="User name"
        value={username}
        onChange={setUsername}
        ref={usernameRef}
      />
      <InputPassword
        type="password"
        placeholder="Password"
        value={password}
        onChange={setPassword}
        ref={passwordRef}
      />
      <Button label="Log in" type="submit" ref={buttonRef} />
      <ButtonLink label="Reset password" type="button" onClick={onPasswordReset} />

      <SSOOptions ssoOptions={ssoOptions} />
    </LoginForm>
  );
};

interface LoginPageProps {
  motd?: string;
  onLogin: (token: string) => void;
  ssoOptions?: SsoOption[];
}

const LoginPage = ({ motd, onLogin, ssoOptions }: LoginPageProps) => {
  const [initialized, setInitialized] = useState(false);
  const [mode, setMode] = useState<'standard' | 'password-reset'>('standard');
  const [passwordResetToken, setPasswordResetToken] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    // check if there's authorize field in query params
    const urlParams = new URLSearchParams(window.location.search);
    const access_token = urlParams.get('authorize');
    const pass_reset_token = urlParams.get('rp');
    const error = urlParams.get('error');
    console.log(
      'LoginPage useEffect triggered with token:',
      access_token,
      'and error:',
      error
    );
    // clear token from url
    window.history.replaceState({}, document.title, window.location.pathname);
    if (access_token) {
      // exchange tokens
      nebula
        .tokenExchange({ body: { access_token }, throwOnError: true })
        .then((response) => {
          onLogin(response.data.access_token);
        });
    } else if (error) {
      toast.error(error);
    } else {
      if (pass_reset_token) {
        setMode('password-reset');
        setPasswordResetToken(pass_reset_token);
      }
      setInitialized(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!initialized) {
    return <LoadingPage />;
  }

  const pageStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  };

  if (nebula.loginBackground) {
    pageStyle.backgroundImage = `url(/api/login-background.jpg)`;
    pageStyle.backgroundPosition = 'center';
    pageStyle.backgroundRepeat = 'no-repeat';
    pageStyle.backgroundSize = 'cover';
  }

  return (
    <main style={pageStyle}>
      <LoginContainer>
        {mode === 'standard' && (
          <StandardLogin
            ssoOptions={ssoOptions}
            onLogin={onLogin}
            onPasswordReset={() => { setMode('password-reset'); }}
          />
        )}
        {mode === 'password-reset' && (
          <PasswordReset
            token={passwordResetToken}
            onGoBack={() => { setMode('standard'); }}
          />
        )}
        {motd && <small>{motd}</small>}
      </LoginContainer>
    </main>
  );
};

export default LoginPage;
