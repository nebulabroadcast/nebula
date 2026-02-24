import nebula from '/src/nebula';

import { useNebula } from '@features/Nebula';
import { useMemo } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router';

import { Navbar, Dropdown, Icon } from '/src/components';

import ChannelSwitcher from './ChannelSwitcher';
import Logo from './Logo';
import PageTitle from './PageTitle';

const NavbarLink = ({ to, label, icon }) => {
  return (
    <NavLink to={to} className="navbar-link">
      {icon && <Icon icon={icon} tooltip={label} />}
      {label && <span className="navbar-link-label">{label}</span>}
    </NavLink>
  );
};

const MainNavbar = () => {
  const navigate = useNavigate();
  const { focusedAsset } = useNebula();
  const [searchParams, _setSearchParams] = useSearchParams();

  const mamSuffix = useMemo(() => {
    const params = new URLSearchParams();
    for (const key of ['date', 'asset']) {
      if (searchParams.has(key)) {
        params.append(key, searchParams.get(key));
      }
    }
    if (focusedAsset && !searchParams.has('asset')) {
      params.append('asset', focusedAsset);
    }
    return params ? `?${params.toString()}` : '';
  }, [searchParams, focusedAsset]);

  const mainMenuOptions = useMemo(() => {
    const result = [];

    for (const plugin of nebula.plugins.filter((plugin) => plugin.scope === 'tool')) {
      result.push({
        icon: plugin.icon || 'extension',
        label: plugin.title,
        onClick: () => navigate(`/tool/${plugin.name}`),
      });
    }

    result.push({
      label: 'Profile',
      icon: 'person',
      onClick: () => navigate('/profile'),
    });

    result.push({
      label: 'Logout',
      icon: 'logout',
      onClick: () => nebula.logout(),
    });
    return result;
  }, []);

  const show = useMemo(() => {
    return {
      scheduler:
        nebula.can('scheduler_view', null, true) ||
        nebula.can('scheduler_edit', null, true),
      rundown:
        nebula.can('rundown_view', null, true) ||
        nebula.can('rundown_edit', null, true),
      system: nebula.can('service_control', null, true),
      jobs: nebula.can('job_control', null, true),
    };
  }, []);

  return (
    <Navbar>
      <div className="left">
        <Logo />
        <NavbarLink
          to={`/mam/editor${mamSuffix}`}
          label="Assets"
          icon="photo_library"
        />

        {show.scheduler && (
          <NavbarLink
            to={`/mam/scheduler${mamSuffix}`}
            label="Scheduler"
            icon="schedule"
          />
        )}

        {show.rundown && (
          <NavbarLink
            to={`/mam/rundown${mamSuffix}`}
            label="Rundown"
            icon="view_list"
          />
        )}

        {show.jobs && <NavbarLink to="/jobs" label="Jobs" icon="settings" />}
        {show.system && <NavbarLink to="/system" label="System" icon="build" />}
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
  );
};

export default MainNavbar;
