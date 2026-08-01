import { Navbar, InputText, Button, Spacer } from '@components';
import React from 'react';
import { NavLink } from 'react-router';

interface JobsNavProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

const JobsNav: React.FC<JobsNavProps> = ({ searchQuery, setSearchQuery }) => {
  return (
    <Navbar>
      <NavLink to="/jobs/active">Active</NavLink>
      <NavLink to="/jobs/finished">Finished</NavLink>
      <NavLink to="/jobs/failed">Failed</NavLink>
      <Spacer />
      <InputText placeholder="Search" value={searchQuery} onChange={setSearchQuery} />
      <Button
        icon="close"
        onClick={() => {
          setSearchQuery('');
        }}
      />
    </Navbar>
  );
};

export default JobsNav;
