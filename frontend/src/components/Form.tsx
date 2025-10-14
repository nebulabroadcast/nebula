import styled from 'styled-components';

const Form = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  row-gap: var(--gap-size);
  column-gap: 16px;

  >label {
    color: #555;
  }

  // .form-title, .form-control {
  //   border: 1px solid red;
  // }

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
    padding-top: 0.3rem;
    user-select: none;
    user-drag: none;
    span {
      white-space: nowrap;
    }
  }

  .form-control {
    display: flex;
    flex-grow: 1;
    > * {
      width: 100%;
    }
  }
`;

interface FormRowProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  tooltip?: string;
  section?: string;
}

const FormRow = ({ title, tooltip, section, children, ...props }: FormRowProps) => {
  return (
    <>
      {section && (
        <div className="form-section">
          <h3>{section}</h3>
        </div>
      )}
      <div className="form-title">
        <span title={tooltip}>{title}</span>
      </div>
      <div className="form-control" {...props}>
        {children}
      </div>
    </>
  );
};

export { Form, FormRow };
