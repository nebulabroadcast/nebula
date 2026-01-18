import { createBrowserRouter, redirect } from 'react-router';
import type { RouteObject } from 'react-router';

import App from './app';

const AppErrorBoundary = () => {
  return <div>Something went wrong. Please try refreshing the page.</div>;
};

const routes: RouteObject[] = [
  {
    path: '/',
    Component: App,
    ErrorBoundary: AppErrorBoundary,
    children: [
      // Default / MAM
      {
        index: true,
        loader: () => redirect('/mam/editor'),
      },
      {
        path: 'mam',
        loader: () => redirect('/mam/editor'),
      },
      {
        path: 'mam/:module',
        lazy: () =>
          import('./pages/MAMPage').then((module) => ({ Component: module.default })),
      },
      // Jobs Page
      {
        path: 'jobs',
        loader: () => redirect('/jobs/active'),
      },
      {
        path: 'jobs/:view',
        lazy: () =>
          import('./pages/JobsPage').then((module) => ({ Component: module.default })),
      },
      // Tool Page
      {
        path: 'tool/:tool',
        lazy: () =>
          import('./pages/ToolPage').then((module) => ({ Component: module.default })),
      },
      // Profile Page
      {
        path: 'profile',
        lazy: () =>
          import('./pages/ProfilePage').then((module) => ({
            Component: module.default,
          })),
      },
      // System Page
      {
        path: 'system',
        loader: () => redirect('/system/services'),
      },
      {
        path: 'system/:view',
        lazy: () =>
          import('./pages/SystemPage').then((module) => ({
            Component: module.default,
          })),
      },
    ],
  },
];

const router = createBrowserRouter(routes);

export default router;
