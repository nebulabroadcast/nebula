import nebula from '/src/nebula'
import styled from 'styled-components'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { NavLink, useNavigate } from 'react-router-dom'

import { Navbar, Dropdown } from '/src/components'

const BasePageTitle = styled.div`
  font-size: 1.2rem;
  font-weight: 500;
  color: #f0f0f0;
  margin-right: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;

  .icon {
    font-size: 2.1rem;
  }
`

const PageTitle = () => {
  const pageTitle = useSelector((state) => state.context.pageTitle)
  const pageIcon = useSelector((state) => state.context.pageIcon)

  return (
    <BasePageTitle>
      {pageIcon && (
        <span className="icon material-symbols-outlined">{pageIcon}</span>
      )}
      <span className="text">{pageTitle}</span>
    </BasePageTitle>
  )
}

const logout = () => {
  nebula
    .request('logout')
    .then(() => {
      window.location.href = '/'
    })
    .catch(() => {
      window.location.href = '/'
    })
}

const NavBar = () => {
  const navigate = useNavigate()
  const focusedAsset = useSelector((state) => state.context.focusedAsset)

  const mamSuffix = focusedAsset ? `?asset=${focusedAsset}` : ''

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
      onClick: logout,
    })
    return result
  }, [])

  return (
    <Navbar>
      <div className="left">
        <NavLink to={`/mam/editor${mamSuffix}`}>Assets</NavLink>
        {false && nebula.settings.system.ui_asset_preview && (
          <NavLink to={`/mam/preview${mamSuffix}`}>Preview</NavLink>
        )}
        <NavLink to="/jobs">Jobs</NavLink>
        {!nebula.user.is_limited && (
          <>
            <NavLink to="/services">Services</NavLink>
          </>
        )}
      </div>
      <div className="center">
        <PageTitle />
      </div>
      <div className="right">
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

export default NavBar
