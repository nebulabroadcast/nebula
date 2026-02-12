import styled from 'styled-components';

export const LoginContainer = styled.div`
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

export const LoginForm = styled.form`
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
