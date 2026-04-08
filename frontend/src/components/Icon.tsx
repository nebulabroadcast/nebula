import clsx from 'clsx';
import './Icon.css';

interface IconProps {
  icon: string;
  style?: React.CSSProperties;
  className?: string;
}

export const Icon = ({ icon, style, className }: IconProps) => {
  return (
    <span
      className={clsx('nb-icon', 'icon', 'material-symbols-outlined', className)}
      style={style}
      translate="no"
    >
      {icon}
    </span>
  );
};
