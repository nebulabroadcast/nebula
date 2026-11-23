import { Navbar, Spacer, Button } from '@components';
import { useDialog } from '@features/Dialogs';
import { useNebula } from '@features/Nebula';
import { getErrorDetail } from '@lib/utils';
import { useMemo } from 'react';
import { useParams, NavLink } from 'react-router';
import { toast } from 'react-toastify';

import Services from './Services';
import Storages from './Storages';
import Users from './Users';

import nebula from '@/nebula';

const SystemNav = () => {
  const showDialog = useDialog();
  const { applySettings } = useNebula();

  const restartServer = () => {
    showDialog('confirm', 'Restart server', {
      message: "Restart the server? Everyone's connection drops for a moment.",
    })
      .then(() => {
        nebula
          .serverRestart({ throwOnError: true })
          .then(() => {
            toast.info('Server is restarting');
          })
          .catch((err: unknown) => {
            toast.error(getErrorDetail(err));
          });
      })
      .catch(() => {
        // dialog dismissed
      });
  };

  const reloadSettings = () => {
    // The response comes once the serving worker has reloaded, and carries
    // the new settings
    nebula
      .serverReloadSettings({ throwOnError: true })
      .then((response) => {
        applySettings(response.data);
        toast.success('Settings reloaded');
      })
      .catch((err: unknown) => {
        toast.error(getErrorDetail(err));
      });
  };

  return (
    <Navbar>
      <NavLink to="/system/services">Services</NavLink>
      <NavLink to="/system/storages">Storages</NavLink>
      <NavLink to="/system/users">Users</NavLink>
      <Spacer />
      {nebula.user?.is_admin && (
        <>
          <Button label="Reload settings" icon="sync" onClick={reloadSettings} />
          <Button label="Restart server" icon="refresh" onClick={restartServer} />
        </>
      )}
    </Navbar>
  );
};

const SystemPage = () => {
  const { view } = useParams();

  const pageComponent = useMemo(() => {
    switch (view) {
      case 'services':
        return <Services />;
      case 'storages':
        return <Storages />;
      case 'users':
        return <Users />;
      default:
        return <div>Select a view from the navigation.</div>;
    }
  }, [view]);

  return (
    <main className="column">
      <SystemNav />
      {pageComponent}
    </main>
  );
};

export default SystemPage;
