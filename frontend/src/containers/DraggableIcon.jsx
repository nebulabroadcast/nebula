import { useDraggable } from '@dnd-kit/core';
import styled from 'styled-components';

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
  user-select: none;
`;

const DraggableIcon = ({ name, icon, tooltip, data }) => {
  const { attributes, listeners } = useDraggable({
    id: name,
    data: [data],
  });

  return (
    <StyledDraggableIcon title={tooltip} {...attributes} {...listeners}>
      <span className="icon material-symbols-outlined">{icon}</span>
    </StyledDraggableIcon>
  );
};

export default DraggableIcon;
