import { Navbar } from '/src/components';
import DraggableIcon from '/src/containers/DraggableIcon';

const dragIcons = [
  {
    name: 'placeholder',
    tooltip: 'Placeholder',
    icon: 'expand',
    data: {
      type: 'item',
      item_role: 'placeholder',
      title: 'Placeholder',
      duration: 3600,
    },
  },
  {
    name: 'live',
    tooltip: 'Live',
    icon: 'live_tv',
    data: {
      type: 'item',
      item_role: 'live',
      title: 'Live',
      duration: 3600,
    },
  },
  {
    name: 'lead_in',
    tooltip: 'Lead In',
    icon: 'vertical_align_bottom',
    data: {
      type: 'item',
      item_role: 'lead_in',
      title: 'Lead In',
    },
  },
  {
    name: 'lead_out',
    tooltip: 'Lead Out',
    icon: 'vertical_align_top',
    data: {
      type: 'item',
      item_role: 'lead_out',
      title: 'Lead Out',
    },
  },
];

const RundownEditTools = () => {
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
