import { NebulaProvider } from '@features/Nebula';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { ToastContainer, Flip } from 'react-toastify';

import { TooltipProvider } from './components/TooltipProvider';
import router from './router';

import 'react-toastify/dist/ReactToastify.css';
import 'material-symbols';
import './index.scss';
import './datepicker.scss';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <NebulaProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
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
      </TooltipProvider>
    </NebulaProvider>
  </React.StrictMode>
);
