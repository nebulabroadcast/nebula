import axios from 'axios'
import nebula from '/src/nebula'

import { useState, useEffect, Suspense } from 'react'
import { useLocalStorage } from '/src/hooks'
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom'

import WebsocketListener from '/src/websocket'
import NavBar from '/src/containers/Navbar'
import LoginPage from '/src/pages/LoginPage'
import LoadingPage from '/src/pages/LoadingPage'
import MAMPage from '/src/pages/MAMPage'
import JobsPage from '/src/pages/JobsPage'
import ServicesPage from '/src/pages/ServicesPage'
import ToolPage from '/src/pages/ToolPage'
import ProfilePage from '/src/pages/ProfilePage'
import UsersPage from '/src/pages/UsersPage'
import Dropdown from '/src/components/Dropdown'
import { setCurrentChannel } from '/src/actions'

const App = () => {
  const [accessToken, setAccessToken] = useLocalStorage('accessToken', null)
  const [errorCode, setErrorCode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initData, setInitData] = useState(null)
  const [channels, setChannels] = useState([])

  // Ensure server connection

  useEffect(() => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    axios.defaults.headers.common['X-Sender'] = nebula.senderId
    axios
      .post('/api/init', {})
      .then((response) => {
        setInitData(response.data)
        nebula.settings = response.data.settings
        nebula.experimental = response.data.experimental || false
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
              window.location.href = '/'
            }
            return Promise.reject(error)
          }
        )
      })
      .catch((err) => setErrorCode(err.response?.status))
      .finally(() => setLoading(false))
  }, [accessToken])

  useEffect(() => {
    if (initData?.settings?.channels) {
      setChannels(initData.settings.channels)
      const mostRecentChannel = JSON.parse(localStorage.getItem('currentChannel'))
      if (mostRecentChannel) {
        setCurrentChannel(mostRecentChannel)
      } else if (initData.settings.channels.length > 0) {
        setCurrentChannel(initData.settings.channels[0])
      }
    }
  }, [initData])

  const handleChannelChange = (channel) => {
    setCurrentChannel(channel)
  }

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
        <Dropdown
          options={channels.map(channel => ({ label: channel.name, value: channel }))}
          onChange={handleChannelChange}
          defaultValue={JSON.parse(localStorage.getItem('currentChannel'))}
        />
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
          <Route path="/users" element={<UsersPage />} />
        </Routes>
      </BrowserRouter>
    </Suspense>
  )
}

export default App
