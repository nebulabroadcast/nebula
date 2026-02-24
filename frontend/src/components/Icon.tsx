import styled from 'styled-components';

const StyledIcon = styled.span`
  user-select: none !important;
  user-drag: none !important;
`;

interface IconProps {
  icon: string;
  tooltip?: string;
  style?: React.CSSProperties;
}

const Icon = ({ icon, style, tooltip }: IconProps) => {
  return (
    <StyledIcon
      className="icon material-symbols-outlined"
      style={style}
      title={tooltip}
      translate="no"
    >
      {icon}
    </StyledIcon>
  );
};

export default Icon;
