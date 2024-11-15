import styled from 'styled-components'
import { useSelector } from 'react-redux'

const BasePageTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 500;
  color: #f0f0f0;
  margin-right: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;

  .icon {
    font-size: 2.1rem;
  }
`

const PageTitle = () => {
  const pageTitle = useSelector((state) => state.context.pageTitle)
  const pageIcon = useSelector((state) => state.context.pageIcon)

  return (
    <BasePageTitle>
      {pageIcon && (
        <span className="icon material-symbols-outlined">{pageIcon}</span>
      )}
      <span className="text">{pageTitle}</span>
    </BasePageTitle>
  )
}

export default PageTitle
