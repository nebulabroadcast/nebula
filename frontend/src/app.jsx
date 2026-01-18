import nebula from '/src/nebula';
import MainNavbar from '@containers/MainNavbar';
import { DialogProvider } from '@features/Dialogs';
import { MediaUploadProvider, MediaUploadMonitor } from '@features/MediaUpload';
import { WebSocketProvider } from '@features/Websocket';
import { useLocalStorage } from '@lib/useLocalStorage';
import axios from 'axios';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';

import LoginPage from '/src/pages/LoginPage';
import LoadingPage from '/src/pages/LoadingPage';
import MAMPage from '/src/pages/MAMPage';
import JobsPage from '/src/pages/JobsPage';
import ToolPage from '/src/pages/ToolPage';
import ProfilePage from '/src/pages/Profile';
import SystemPage from '/src/pages/System';

const App = () => {
  const [accessToken, setAccessToken] = useLocalStorage('accessToken', null);
  const [errorCode, setErrorCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initData, setInitData] = useState(null);

  const wsAddress = useMemo(() => {
    const proto = window.location.protocol.replace('http', 'ws');
    return `${proto}//${window.location.host}/ws`;
  }, []);

  // Ensure server connection

  useEffect(() => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    axios.defaults.headers.common['X-Sender'] = nebula.senderId;
    axios
      .post('/api/init', {})
      .then((response) => {
        setInitData(response.data);
        nebula.settings = response.data.settings;
        nebula.experimental = response.data.experimental || false;
        nebula.plugins = response.data.frontend_plugins || [];
        nebula.scopedEndpoints = response.data.scoped_endpoints || [];
        nebula.loginBackground = response.data.background || false;
        nebula.user = response.data.user || {};
        axios.interceptors.response.use(
          (response) => {
            return response;
          },
          (error) => {
            if (error.response.status === 401 && window.location.pathname !== '/') {
              window.location.href = '/';
            }
            return Promise.reject(error);
          }
        );
      })
      .catch((err) => setErrorCode(err.response?.status))
      .finally(() => setLoading(false));
  }, [accessToken]);

  // Render

  if (loading) return <LoadingPage />;
  if (errorCode > 401) return <main className="center">server unavailable</main>;

  if (!initData.installed)
    return <main className="center">nebula is not installed</main>;

  if (!initData.user)
    return (
      <LoginPage
        motd={initData.motd}
        onLogin={setAccessToken}
        ssoOptions={initData.sso_options}
      />
    );

  return (
    <Suspense fallback={<LoadingPage />}>
      <WebSocketProvider url={wsAddress}>
        <DialogProvider>
          <MediaUploadProvider>
            <BrowserRouter>
              <MainNavbar />
              <Routes>
                <Route path="/" exact element={<Navigate replace to="/mam/editor" />} />
                <Route
                  path="/mam"
                  exact
                  element={<Navigate replace to="/mam/editor" />}
                />
                <Route path="/mam/:module" element={<MAMPage />} />
                <Route
                  path="/jobs"
                  exact
                  element={<Navigate replace to="/jobs/active" />}
                />
                <Route
                  path="/system"
                  exact
                  element={<Navigate replace to="/system/services" />}
                />
                <Route path="/jobs/:view" element={<JobsPage />} />
                <Route path="/system/:view" element={<SystemPage />} />
                <Route path="/tool/:tool" element={<ToolPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
              <MediaUploadMonitor />
            </BrowserRouter>
          </MediaUploadProvider>
        </DialogProvider>
      </WebSocketProvider>
    </Suspense>
  );
};

export default App;
