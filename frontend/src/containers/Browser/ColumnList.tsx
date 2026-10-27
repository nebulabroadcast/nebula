import clsx from 'clsx';
import { useState } from 'react';

import { Icon } from './ViewList';

import nebula from '@/nebula';

interface ColumnListProps {
  columns: string[];
  onChange: (columns: string[]) => void;
}

// The tab's columns in order: drag a row to move it, x hides it (the
// last one stays)
const ColumnList = ({ columns, onChange }: ColumnListProps) => {
  const [dragged, setDragged] = useState<number | null>(null);
  // Where the dragged column would go: before this index
  const [target, setTarget] = useState<number | null>(null);

  const drop = () => {
    if (dragged !== null && target !== null && target !== dragged) {
      const moved = columns.filter((_, idx) => idx !== dragged);
      moved.splice(target > dragged ? target - 1 : target, 0, columns[dragged]);
      onChange(moved);
    }
    setDragged(null);
    setTarget(null);
  };

  return (
    <div>
      {columns.map((name, idx) => (
        <div
          key={name}
          draggable
          className={clsx(
            'it column-row',
            dragged === idx && 'dragging',
            target === idx && 'drop-before',
            target === columns.length && idx === columns.length - 1 && 'drop-after'
          )}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move';
            setDragged(idx);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            const box = event.currentTarget.getBoundingClientRect();
            setTarget(event.clientY < box.top + box.height / 2 ? idx : idx + 1);
          }}
          onDrop={(event) => {
            event.preventDefault();
            drop();
          }}
          onDragEnd={() => {
            setDragged(null);
            setTarget(null);
          }}
        >
          <Icon name="drag_indicator" />
          <span className="grow">{nebula.metaType(name).title || name}</span>
          <span className="dim">{name}</span>
          {columns.length > 1 && (
            <span
              title="Hide"
              onClick={() => {
                onChange(columns.filter((c) => c !== name));
              }}
            >
              <Icon name="close" className="remove" />
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default ColumnList;
