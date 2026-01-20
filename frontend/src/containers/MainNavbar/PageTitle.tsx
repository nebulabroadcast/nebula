import { Icon, NavbarTitle } from '@components';
import { useNebula } from '@features/Nebula';

const PageTitle = () => {
  const { pageTitle } = useNebula();
  const { title, icon } = pageTitle;

  return (
    <NavbarTitle>
      {icon && <Icon icon={icon}/>}
      <span className="text">{title}</span>
    </NavbarTitle>
  );
};

export default PageTitle;
