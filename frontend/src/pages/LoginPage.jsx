import axios from 'axios';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

import { Button, InputText, InputPassword } from '/src/components';
import NebulaLogo from '/src/svg/logo-wide.svg';

import styled from 'styled-components';

import nebula from '/src/nebula';

import LoadingPage from './LoadingPage';

const LoginContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;

  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;

  small {
    font-size: 0.8em;
    font-style: italic;
    color: var(--color-text-dim);
  }
`;

const LoginForm = styled.form`
  padding: 40px;
  background-color: var(--color-surface-02);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 200px;
  min-height: 100px;
  max-width: 85%;
  max-height: 85%;
  position: relative;

  &.glass {
    background-color: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(10px);

    input,
    button,
    a {
      background-color: rgba(255, 255, 255, 0.1) !important;
      color: #eee !important;

      &::placeholder {
        color: #ccc;
        opacity: 1; /* Firefox */
      }
    }
  }

  hr {
    border: none;
    border-top: 1px solid var(--color-surface-04);
    margin: 12px 0;
  }

  .logo-container {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;

    img {
      width: 200px;
      height: auto;
      margin-bottom: 2em;
    }
  }
`;

const SSOOptions = ({ ssoOptions }) => {
  return (
    <>
      <hr />
      {ssoOptions.map((option) => (
        <Button
          key={option.name}
          as="a"
          href={`/api/sso/login/${option.name}`}
          label={option.title}
        />
      ))}
    </>
  );
};

const LoginPage = ({ motd, onLogin, ssoOptions }) => {
  const [initialized, setInitialized] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginInput, setLoginInput] = useState(null);

  const passwordRef = useRef();
  const buttonRef = useRef();

  useEffect(() => {
    // check if there's authorize field in query params
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('authorize');
    const error = urlParams.get('error');
    // clear token from url
    window.history.replaceState({}, document.title, window.location.pathname);
    if (token) {
      // exchange tokens
      axios.post('/api/token-exchange', { access_token: token }).then((response) => {
        onLogin(response.data.access_token);
      });
    } else if (error) {
      toast.error(error);
    } else {
      setInitialized(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loginInput?.focus();
  }, [loginInput]);

  const onSubmit = (event) => {
    event.preventDefault();
    axios
      .post('/api/login', { username, password })
      .then((response) => {
        onLogin(response.data.access_token);
      })
      .catch((err) => {
        if (err.response.status === 422) {
          toast.error(
            <>
              <p>
                <strong>Login failed</strong>
              </p>
              <p>Invalid request</p>
            </>
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

  const loginDisabled = !username || !password;

  if (!initialized) {
    return <LoadingPage />;
  }

  const pageStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  };
  let formClass = null;
  if (nebula.loginBackground) {
    pageStyle.backgroundImage = `url(/api/login-background.jpg)`;
    pageStyle.backgroundPosition = 'center';
    pageStyle.backgroundRepeat = 'no-repeat';
    pageStyle.backgroundSize = 'cover';
    formClass = 'glass';
  }

  return (
    <main style={pageStyle}>
      <LoginContainer>
        <LoginForm onSubmit={onSubmit} className={formClass}>
          <div className="logo-container">
            <img src={NebulaLogo} alt="Nebula" />
          </div>
          <InputText
            placeholder="User name"
            name="username"
            value={username}
            onChange={setUsername}
            ref={setLoginInput}
          />
          <InputPassword
            type="password"
            name="password"
            placeholder="Password"
            value={password}
            onChange={setPassword}
            ref={passwordRef}
          />
          <Button
            label="Log in"
            type="submit"
            ref={buttonRef}
            disabled={loginDisabled}
          />
          {ssoOptions && <SSOOptions ssoOptions={ssoOptions} />}
        </LoginForm>
        {motd && <small>{motd}</small>}
      </LoginContainer>
    </main>
  );
};

export default LoginPage;
