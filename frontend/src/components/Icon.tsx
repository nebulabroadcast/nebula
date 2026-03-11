import styled from 'styled-components';

const StyledIcon = styled.span`
  user-select: none !important;
  user-drag: none !important;
`;

interface IconProps {
  icon: string;
  style?: React.CSSProperties;
  className?: string;
}

const Icon = ({ icon, style, className }: IconProps) => {
  return (
    <StyledIcon
      className={`icon material-symbols-outlined ${className || ''}`}
      style={style}
      translate="no"
    >
      {icon}
    </StyledIcon>
  );
};

export default Icon;
