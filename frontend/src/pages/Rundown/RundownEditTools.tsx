import { Navbar } from '@components';
import DraggableIcon from '@containers/DraggableIcon';
import React from 'react';

const dragIcons = [
  {
    name: 'placeholder',
    tooltip: 'Placeholder',
    icon: 'expand',
    data: {
      type: 'item' as const,
      item_role: 'placeholder' as const,
      title: 'Placeholder',
      duration: 3600,
    },
  },
  {
    name: 'live',
    tooltip: 'Live',
    icon: 'live_tv',
    data: {
      type: 'item' as const,
      item_role: 'live' as const,
      title: 'Live',
      duration: 3600,
    },
  },
  {
    name: 'lead_in',
    tooltip: 'Lead In',
    icon: 'vertical_align_bottom',
    data: {
      type: 'item' as const,
      item_role: 'lead_in' as const,
      title: 'Lead In',
    },
  },
  {
    name: 'lead_out',
    tooltip: 'Lead Out',
    icon: 'vertical_align_top',
    data: {
      type: 'item' as const,
      item_role: 'lead_out' as const,
      title: 'Lead Out',
    },
  },
];

const RundownEditTools: React.FC = () => {
  return (
    <Navbar>
      {dragIcons.map((icon, index) => (
        <DraggableIcon
          key={index}
          name={icon.name}
          icon={icon.icon}
          tooltip={icon.tooltip}
          data={icon.data}
        />
      ))}
    </Navbar>
  );
};

export default RundownEditTools;
