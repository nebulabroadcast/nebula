import clsx from 'clsx';
import './Button.css';

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

export const ButtonLink = (props: ButtonLinkProps) => {
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

  const _anchorStyle = { ...style, display: 'inline-block' };
  const _iconStyle = { ...iconStyle };

  if (hlColor && !anchorProps.disabled) {
    _iconStyle.color = props.hlColor;
  }

  return (
    <a
      className={clsx(
        'nb-button',
        className,
        active && 'active',
        !label && 'icon-only'
      )}
      style={_anchorStyle}
      data-tooltip={tooltip}
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
    </a>
  );
};
