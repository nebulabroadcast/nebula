import { NavbarTitle } from '@components';
import { useNebula } from '@features/Nebula';

const PageTitle = () => {
  const { pageTitle } = useNebula();
  const { title, icon } = pageTitle;

  return (
    <NavbarTitle>
      {icon && <span className="icon material-symbols-outlined">{icon}</span>}
      <span className="text">{title}</span>
    </NavbarTitle>
  );
};

export default PageTitle;
