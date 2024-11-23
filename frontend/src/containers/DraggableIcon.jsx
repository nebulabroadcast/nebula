import styled from 'styled-components'

import { useDraggable } from '@dnd-kit/core'

const StyledDraggableIcon = styled.div`
  width: 30px;
  height: 30px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 4px;
  background: var(--color-surface-04);
  color: var(--color-surface-text);
  cursor: grab;
`

const DraggableIcon = ({ name, icon, tooltip, data }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: name, data: [data] })

  return (
    <StyledDraggableIcon title={tooltip} {...attributes} {...listeners}>
      <span className="icon material-symbols-outlined">{icon}</span>
    </StyledDraggableIcon>
  )
}

export default DraggableIcon