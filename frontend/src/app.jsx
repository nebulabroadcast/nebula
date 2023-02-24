import axios from 'axios'

import nebula from '/src/nebula'

import { useState, useEffect, Suspense } from 'react'
import { useLocalStorage } from '/src/hooks'
import { toast } from 'react-toastify'
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom'

import WebsocketListener from '/src/websocket'
import NavBar from '/src/containers/navbar'
import LoginPage from '/src/pages/login'
import LoadingPage from '/src/pages/loading'
import MAMPage from '/src/pages/mam'
import JobsPage from '/src/pages/jobs'
import ServicesPage from '/src/pages/services'
import ToolPage from '/src/pages/tool'
import ProfilePage from '/src/pages/profile'

const App = () => {
  const [accessToken, setAccessToken] = useLocalStorage('accessToken', null)
  const [errorCode, setErrorCode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initData, setInitData] = useState(null)

  // Ensure server connection

  useEffect(() => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    axios
      .post('/api/init', {})
      .then((response) => {
        setInitData(response.data)
        nebula.settings = response.data.settings
        nebula.plugins = response.data.frontend_plugins || []
        nebula.scopedEndpoints = response.data.scoped_endpoints || []
        nebula.user = response.data.user || {}
        axios.interceptors.response.use(
          (response) => {
            return response
          },
          (error) => {
            console.error(error)
            if (
              error.response.status === 401 &&
              window.location.pathname !== '/'
            ) {
              toast.error('Not logged in')
              window.location.href = '/'
            }
            return Promise.reject(error)
          }
        )
      })
      .catch((err) => setErrorCode(err.response?.status))
      .finally(() => setLoading(false))
  }, [accessToken])

  // Render

  if (loading) return <LoadingPage />

  if (errorCode > 401) return <main className="center">server unavailable</main>

  if (!initData.installed)
    return <main className="center">nebula is not installed</main>

  if (!initData.user)
    return <LoginPage motd={initData.motd} onLogin={setAccessToken} />

  return (
    <Suspense fallback={<LoadingPage />}>
      <WebsocketListener />
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route
            path="/"
            exact
            element={<Navigate replace to="/mam/editor" />}
          />
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
          <Route path="/jobs/:view" element={<JobsPage />} />
          <Route path="/tool/:tool" element={<ToolPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </BrowserRouter>
    </Suspense>
  )
}

export default App
