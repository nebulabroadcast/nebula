import { NavLink } from 'react-router-dom';
import { Navbar, InputText, Button, Spacer } from '/src/components';

const JobsNav = ({ searchQuery, setSearchQuery }) => {
  return (
    <Navbar>
      <NavLink to="/jobs/active">Active</NavLink>
      <NavLink to="/jobs/finished">Finished</NavLink>
      <NavLink to="/jobs/failed">Failed</NavLink>
      <Spacer />
      <InputText placeholder="Search" value={searchQuery} onChange={setSearchQuery} />
      <Button icon="close" onClick={() => setSearchQuery('')} />
    </Navbar>
  );
};

export default JobsNav;
