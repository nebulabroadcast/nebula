import styled from 'styled-components'

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--gap-size);

  .form-row {
    display: flex;
    flex-direction: row;
    gap: var(--gap-size);

    .form-title {
      min-width: 200px;
      max-width: 200px;
      padding-top: 0.5rem;
    }

    .form-control {
      display: flex;
      flex-grow: 1;
      min-width: 220px;
      > * {
        width: 100%;
      }
    }
  }
`

const FormRow = ({ title, tooltip, children, ...props }) => {
  return (
    <div className="form-row" {...props}>
      <div className="form-title">
        <span title={tooltip}>{title}</span>
      </div>
      <div className="form-control">{children}</div>
    </div>
  )
}

export { Form, FormRow }
