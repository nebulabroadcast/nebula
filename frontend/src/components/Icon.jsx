import styled from 'styled-components';

const StyledIcon = styled.span`
  user-select: none !important;
  user-drag: none !important;
`;

const Icon = ({ icon, style }) => {
  return (
    <StyledIcon className="icon material-symbols-outlined" style={style}>
      {icon}
    </StyledIcon>
  );
};

export default Icon;
