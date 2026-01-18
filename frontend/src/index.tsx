import { NebulaProvider } from '@features/Nebula';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ToastContainer, Flip } from 'react-toastify';

import App from './app';

import 'react-toastify/dist/ReactToastify.css';
import 'material-symbols';
import './index.scss';
import './datepicker.scss';

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <NebulaProvider>
      <App />
      <ToastContainer
        position="bottom-right"
        transition={Flip}
        theme="dark"
        pauseOnFocusLoss={false}
        newestOnTop={true}
        draggable={false}
        closeOnClick={true}
        autoClose={3000}
        limit={5}
      />
    </NebulaProvider>
  </React.StrictMode>
);
