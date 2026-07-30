import MainNavbar from '@containers/MainNavbar';
import { DialogProvider } from '@features/Dialogs';
import { MediaUploadProvider, MediaUploadMonitor } from '@features/MediaUpload';
import { WebSocketProvider } from '@features/Websocket';
import { useLocalStorage } from '@lib/useLocalStorage';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';

import type { InitResponse } from './client';
import LoadingPage from './pages/LoadingPage';
import LoginPage from './pages/LoginPage/LoginPage';

import nebula, { client } from '@/nebula';

const App = () => {
  const [accessToken, setAccessToken] = useLocalStorage<string | null>(
    'accessToken',
    null
  );
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
    client.instance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
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
          (error) => {
            if (error.response?.status === 401) {
              setAccessToken(null);
              if (window.location.pathname !== '/') {
                window.location.href = '/';
              }
            }
            return Promise.reject(error);
          }
        );
      })
      .catch((err) => {
        setErrorCode(err.response?.status);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accessToken]);

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
        onLogin={setAccessToken}
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
