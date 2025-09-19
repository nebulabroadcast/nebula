import React, { useMemo } from 'react';
import { useParams, NavLink } from 'react-router-dom';

import { Navbar, Spacer, Section, Button } from '/src/components';

import Services from './Services';
import Storages from './Storages';
import Users from './Users';

const SystemNav = () => {
  return (
    <Navbar>
      <NavLink to="/system/services">Services</NavLink>
      <NavLink to="/system/storages">Storages</NavLink>
      <NavLink to="/system/users">Users</NavLink>
      <Spacer />
      <Button label="Restart server" icon="refresh" />
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
      <SystemNav/>
      {pageComponent}
    </main>
  );
};

export default SystemPage;

