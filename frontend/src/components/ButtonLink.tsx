import clsx from 'clsx';
import styled from 'styled-components';
import { ButtonStyle } from './Button.styled';

interface ButtonLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  icon?: string;
  iconStyle?: React.CSSProperties;
  label?: string;
  active?: boolean;
  className?: string;
  tooltip?: string;
  hlColor?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  iconOnRight?: boolean;
}

const StyledAnchor = styled.a`
  display: inline-block;
  ${ButtonStyle}
`;

const ButtonLink = (props: ButtonLinkProps) => {
  const {
    hlColor,
    style,
    icon,
    iconStyle,
    className,
    label,
    active,
    tooltip,
    iconOnRight,
    ...anchorProps
  } = props;

  const _anchorStyle = style || {};
  const _iconStyle = iconStyle || {};

  if (hlColor && !anchorProps.disabled) {
    //_anchorStyle.borderBottom = `1px solid ${props.hlColor}`;
    _iconStyle.color = props.hlColor;
  }

  return (
    <StyledAnchor
      className={clsx(className, active && 'active', !label && 'icon-only')}
      style={_anchorStyle}
      title={tooltip}
      {...anchorProps}
    >
      {label && iconOnRight && <span>{label}</span>}
      {icon && (
        <span
          className="icon material-symbols-outlined"
          style={_iconStyle}
          translate="no"
        >
          {icon}
        </span>
      )}
      {!iconOnRight && label && <span>{label}</span>}
    </StyledAnchor>
  );
};

export default ButtonLink;
