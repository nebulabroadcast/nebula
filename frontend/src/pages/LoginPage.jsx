import axios from 'axios'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { Button, InputText, InputPassword } from '/src/components'
import NebulaLogo from '/src/svg/logo-wide.svg'
import styled from 'styled-components'

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

  small {
    font-size: 0.8em;
    font-style: italic;
    color: var(--color-text-dim);
  }
`

const LoginForm = styled.form`
  padding: 30px;
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
`

const LoginPage = ({ motd, onLogin }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const loginRef = useRef()
  const passwordRef = useRef()
  const buttonRef = useRef()

  useEffect(() => {
    loginRef.current.focus()
  }, [])

  const onSubmit = (event) => {
    event.preventDefault()
    axios
      .post('/api/login', { username, password })
      .then((response) => {
        onLogin(response.data.access_token)
      })
      .catch((err) => {
        toast.error((
          <>
            <p><strong>Login failed</strong></p>
            <p>{err.response.data?.detail || "Unknown error" }</p>
          </>
        ))
      })
  }

  return (
    <main>
      <LoginContainer>
        <LoginForm onSubmit={onSubmit}>
          <div className="logo-container">
            <img src={NebulaLogo} alt="Nebula" />
          </div>
          <InputText
            placeholder="User name"
            name="username"
            value={username}
            onChange={setUsername}
            ref={loginRef}
          />
          <InputPassword
            type="password"
            name="password"
            placeholder="Password"
            value={password}
            onChange={setPassword}
            ref={passwordRef}
          />
          <Button label="Log in" type="submit" ref={buttonRef} />
        </LoginForm>
        {motd && <small>{motd}</small>}
      </LoginContainer>
    </main>
  )
}

export default LoginPage
