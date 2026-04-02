import { Navbar, Dropdown } from '@components';
import { useNebula } from '@features/Nebula';
import { useMemo } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router';

import ChannelSwitcher from './ChannelSwitcher';
import Logo from './Logo';
import PageTitle from './PageTitle';

import nebula from '@/nebula';

const MainNavbar = () => {
  const navigate = useNavigate();
  const { focusedAsset } = useNebula();
  const [searchParams] = useSearchParams();

  const mamSuffix = useMemo(() => {
    const params = new URLSearchParams();
    for (const key of ['date', 'asset']) {
      const value = searchParams.get(key);
      if (value) {
        params.append(key, value);
      }
    }
    if (focusedAsset && !searchParams.has('asset')) {
      params.append('asset', focusedAsset.toString());
    }
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }, [searchParams, focusedAsset]);

  const mainMenuOptions = useMemo(() => {
    const result = [];

    for (const plugin of (nebula.plugins || []).filter(
      (plugin) => plugin.scope === 'tool'
    )) {
      result.push({
        icon: plugin.icon || 'extension',
        label: plugin.title,
        value: plugin.name,
        onClick: () => navigate(`/tool/${plugin.name}`),
      });
    }

    result.push({
      label: 'Profile',
      icon: 'person',
      value: 'profile',
      onClick: () => navigate('/profile'),
    });

    result.push({
      label: 'Logout',
      icon: 'logout',
      value: 'logout',
      onClick: () => {
        nebula.logout();
      },
    });
    return result;
  }, [navigate]);

  const show = useMemo(() => {
    return {
      scheduler:
        nebula.can('scheduler_view', '', true) ||
        nebula.can('scheduler_edit', '', true),
      rundown:
        nebula.can('rundown_view', '', true) || nebula.can('rundown_edit', '', true),
      system: nebula.can('service_control', '', true),
      jobs: nebula.can('job_control', '', true),
    };
  }, []);

  return (
    <Navbar>
      <div className="left">
        <Logo />
        <NavLink to={`/mam/editor${mamSuffix}`}>Assets</NavLink>
        {show.scheduler && (
          <NavLink to={`/mam/scheduler${mamSuffix}`}>Scheduler</NavLink>
        )}
        {show.rundown && <NavLink to={`/mam/rundown${mamSuffix}`}>Rundown</NavLink>}
        {show.jobs && <NavLink to="/jobs">Jobs</NavLink>}
        {show.system && <NavLink to="/system">System</NavLink>}
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
