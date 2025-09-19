import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { NavbarTitle } from '/src/components';

const PageTitle = () => {
  const pageTitle = useSelector((state) => state.context.pageTitle);
  const pageIcon = useSelector((state) => state.context.pageIcon);

  return (
    <NavbarTitle>
      {pageIcon && <span className="icon material-symbols-outlined">{pageIcon}</span>}
      <span className="text">{pageTitle}</span>
    </NavbarTitle>
  );
};

export default PageTitle;
