import nebula from '/src/nebula'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import {
  NavLink,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'

import { Navbar, Dropdown } from '/src/components'

import Logo from './Logo'
import PageTitle from './PageTitle'
import ChannelSwitcher from './ChannelSwitcher'

const MainNavbar = () => {
  const navigate = useNavigate()
  const focusedAsset = useSelector((state) => state.context.focusedAsset)
  const [searchParams, setSearchParams] = useSearchParams()

  const mamSuffix = useMemo(() => {
    const params = new URLSearchParams()
    for (const key of ['date', 'asset']) {
      if (searchParams.has(key)) {
        params.append(key, searchParams.get(key))
      }
    }
    if (focusedAsset && !searchParams.has('asset')) {
      params.append('asset', focusedAsset)
    }
    return params ? `?${params.toString()}` : ''
  }, [searchParams, focusedAsset])

  const mainMenuOptions = useMemo(() => {
    const result = []

    for (const plugin of nebula.plugins.filter(
      (plugin) => plugin.scope === 'tool'
    )) {
      result.push({
        icon: plugin.icon || 'extension',
        label: plugin.title,
        onClick: () => navigate(`/tool/${plugin.name}`),
      })
    }

    result.push({
      label: 'Profile',
      icon: 'person',
      onClick: () => navigate('/profile'),
    })

    result.push({
      label: 'Logout',
      icon: 'logout',
      onClick: () => nebula.logout(),
    })
    return result
  }, [])

  const show = useMemo(() => {
    return {
      scheduler:
        nebula.can('scheduler_view', null, true) ||
        nebula.can('scheduler_edit', null, true),
      rundown:
        nebula.can('rundown_view', null, true) ||
        nebula.can('rundown_edit', null, true),
      services: nebula.can('service_control', null, true),
      jobs: nebula.can('job_control', null, true),
    }
  }, [])

  return (
    <Navbar>
      <div className="left">
        <Logo />
        <NavLink to={`/mam/editor${mamSuffix}`}>Assets</NavLink>
        {nebula.experimental && (
          <>
            {show.scheduler && (
              <NavLink to={`/mam/scheduler${mamSuffix}`}>Scheduler</NavLink>
            )}
            {show.rundown && (
              <NavLink to={`/mam/rundown${mamSuffix}`}>Rundown</NavLink>
            )}
          </>
        )}
        {show.jobs && <NavLink to="/jobs">Jobs</NavLink>}
        {show.services && <NavLink to="/services">Services</NavLink>}
      </div>
      <div className="center">
        <PageTitle />
      </div>
      <div className="right">
        <ChannelSwitcher />
        <Dropdown
          icon="apps"
          align="right"
          options={mainMenuOptions}
          buttonStyle={{ background: 'none' }}
        />
      </div>
    </Navbar>
  )
}

export default MainNavbar
