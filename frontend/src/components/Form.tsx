import styled from 'styled-components';

import Icon from './Icon';

const Form = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  row-gap: var(--gap-size);
  column-gap: 16px;

  > label {
    color: #555;
  }

  .form-section {
    grid-column: 1 / -1;
    h3 {
      width: 100%;
      text-align: center;
      font-size: 1rem;
      font-weight: 500;
    }
  }

  .form-title {
    user-select: none;
    user-drag: none;
    padding-top: 5px;

    .form-title-content {
      span {
        white-space: nowrap;
      }
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  .form-control {
    display: flex;
    flex-grow: 1;
    gap: 4px;
    > * {
      width: 100%;
    }
  }
`;

interface FormRowProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  tooltip?: string;
  section?: string;
  changed?: boolean;
}

const FormRow = ({
  title,
  tooltip,
  section,
  children,
  changed,
  ...props
}: FormRowProps) => {
  return (
    <>
      {section && (
        <div className="form-section">
          <h3>{section}</h3>
        </div>
      )}
      <div className="form-title">
        <div className="form-title-content" data-tooltip={tooltip}>
          <span>{title}</span>
          {tooltip && (
            <Icon
              icon="info"
              aria-hidden="true"
              style={{ fontSize: '0.9em', color: 'var(--color-text-dim)' }}
            />
          )}
          <span
            style={{
              color: 'var(--color-violet)',
              opacity: changed ? 1 : 0,
            }}
          >
            {' '}
            *
          </span>
        </div>
      </div>
      <div className="form-control" {...props}>
        {children}
      </div>
    </>
  );
};

export { Form, FormRow };
