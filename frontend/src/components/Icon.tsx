import styled from 'styled-components';

const StyledIcon = styled.span`
  user-select: none !important;
  user-drag: none !important;
`;

interface IconProps {
  icon: string;
  style?: React.CSSProperties;
}

const Icon = ({ icon, style }:IconProps) => {
  return (
    <StyledIcon className="icon material-symbols-outlined" style={style}>
      {icon}
    </StyledIcon>
  );
};

export default Icon;
