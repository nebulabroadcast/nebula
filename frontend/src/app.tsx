import MainNavbar from '@containers/MainNavbar';
import { DialogProvider } from '@features/Dialogs';
import { MediaUploadProvider, MediaUploadMonitor } from '@features/MediaUpload';
import { WebSocketProvider } from '@features/Websocket';
import { AxiosError } from 'axios';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';

import type { InitResponse } from './client';
import LoadingPage from './pages/LoadingPage';
import LoginPage from './pages/LoginPage/LoginPage';

import nebula, { client } from '@/nebula';

const App = () => {
  // Requests and the websocket authenticate with the HttpOnly session
  // cookie the server sets on login; the frontend never sees the token.
  // A login or a 401 bumps this, which re-runs init.
  const [authVersion, setAuthVersion] = useState(0);
  const onAuthChange = () => {
    setAuthVersion((v) => v + 1);
  };

  useEffect(() => {
    // Older versions kept the token in localStorage
    try {
      localStorage.removeItem('accessToken');
    } catch {
      // storage unavailable: nothing to clean up
    }
  }, []);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [initData, setInitData] = useState<InitResponse | null>(null);

  const wsAddress = useMemo(() => {
    const proto = window.location.protocol.replace('http', 'ws');
    return `${proto}//${window.location.host}/ws`;
  }, []);

  const location = useLocation();

  // Ensure server connection

  useEffect(() => {
    client.instance.defaults.headers.common['X-Client-Id'] = nebula.senderId;
    nebula
      .init({ throwOnError: true })
      .then((response) => {
        const data: InitResponse = response.data;
        setInitData(data);
        nebula.settings = data.settings || undefined;
        nebula.experimental = data.experimental || false;
        nebula.plugins = data.frontend_plugins || [];
        nebula.scopedEndpoints = data.scoped_endpoints || [];
        nebula.loginBackground = data.background || false;
        nebula.user = data.user || undefined;
        client.instance.interceptors.response.use(
          (response) => {
            return response;
          },
          (error: unknown) => {
            if (error instanceof AxiosError && error.response?.status === 401) {
              onAuthChange();
              if (window.location.pathname !== '/') {
                window.location.href = '/';
              }
            }
            // rethrow so the caller's catch still sees the original error
            throw error;
          }
        );
      })
      .catch((err: unknown) => {
        setErrorCode(err instanceof AxiosError ? (err.response?.status ?? null) : null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authVersion]);

  useEffect(() => {
    // if we are logged in, but we are at  the root, redirect to /mam
    if (initData?.user && location.pathname === '/') {
      window.location.href = '/mam/editor';
    }
  }, [initData, location]);

  // Render

  if (loading) return <LoadingPage />;
  if (errorCode && errorCode > 401)
    return <main className="center">server unavailable</main>;

  if (!initData?.installed)
    return <main className="center">nebula is not installed</main>;

  if (!initData.user)
    return (
      <LoginPage
        motd={initData.motd || undefined}
        onLogin={onAuthChange}
        ssoOptions={initData.sso_options || undefined}
      />
    );

  return (
    <Suspense fallback={<LoadingPage />}>
      <WebSocketProvider url={wsAddress}>
        <DialogProvider>
          <MediaUploadProvider>
            <MainNavbar />
            <Outlet />
            <MediaUploadMonitor />
          </MediaUploadProvider>
        </DialogProvider>
      </WebSocketProvider>
    </Suspense>
  );
};

export default App;
