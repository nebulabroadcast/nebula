import React, { useMemo } from 'react';

import { Icon } from './Icon';
import './Form.css';

const Form = (props: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className="nb-form" {...props}>
      {props.children}
    </div>
  );
};

interface FormRowProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  tooltip?: string;
  section?: string;
  changed?: boolean;
}

const FormTooltipIcon = (
  <Icon
    icon="info"
    aria-hidden="true"
    style={{ fontSize: '0.9em', color: 'var(--color-text-dim)' }}
  />
);

const FormRow = ({
  title,
  tooltip,
  section,
  children,
  changed,
  ...props
}: FormRowProps) => {
  const changedIndicator = useMemo(
    () => (
      <span style={{ color: 'var(--color-violet)', opacity: changed ? 1 : 0 }}>*</span>
    ),
    [changed]
  );

  return (
    <>
      {section && (
        <div className="nb-form-section">
          <h3>{section}</h3>
        </div>
      )}
      <div className="nb-form-title">
        <div className="nb-form-title-content" data-tooltip={tooltip}>
          <span>{title}</span>
          {tooltip && FormTooltipIcon}
          {changedIndicator}
        </div>
      </div>
      <div className="nb-form-control" {...props}>
        {children}
      </div>
    </>
  );
};

export { Form, FormRow };
