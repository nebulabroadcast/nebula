import { toast } from 'react-toastify';
import axios from 'axios';
import { InputText, InputPassword, Button } from '@components';
import React from 'react';

import { LoginForm } from './LoginPage.styled';
import NebulaLogo from '/src/assets/logo-wide.svg';

interface PasswordResetProps {
  token?: string;
  onGoBack: () => void;
}

export const PasswordReset = ({ token, onGoBack }: PasswordResetProps) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const onResetRequest = (event: React.FormEvent) => {
    event.preventDefault();
    axios
      .post('/api/password-reset', { email })
      .then(() => {
        toast.info(
          'If an account with that email exists, a password reset link has been sent.'
        );
        onGoBack();
      })
      .catch(() => {
        toast.error(
          'Unable to process password reset request. Please try again later.'
        );
      });
  };

  const onResetCallback = (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    axios
      .post('/api/password-reset-callback', { token, password })
      .then(() => {
        toast.success('Password reset successfully');
        onGoBack();
      })
      .catch((err) => {
        toast.error(err.response?.data?.detail || 'Error resetting password');
      });
  };

  if (token) {
    return (
      <LoginForm onSubmit={onResetCallback}>
        <div className="logo-container">
          <img src={NebulaLogo} alt="Nebula" />
        </div>

        <small>Enter your new password below.</small>

        <InputPassword
          placeholder="New password"
          value={password}
          onChange={setPassword}
        />
        <InputPassword
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
        <Button label="Reset password" type="submit" ref={buttonRef} />
        <Button label="Back to login" type="button" onClick={onGoBack} />
      </LoginForm>
    );
  }

  return (
    <LoginForm onSubmit={onResetRequest}>
      <div className="logo-container">
        <img src={NebulaLogo} alt="Nebula" />
      </div>
      <small>Enter your email address to receive a password reset link.</small>
      <InputText placeholder="email" value={email} onChange={setEmail} />
      <Button label="Request password reset" type="submit" ref={buttonRef} />
    </LoginForm>
  );
};
