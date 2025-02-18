import { useMemo } from 'react';

import { Button, Dialog } from '/src/components';

const SubclipsDialog = (props) => {
  const onCancel = () => props.handleCancel();
  const onConfirm = (option) => props.handleConfirm(option);

  const body = useMemo(() => {
    const options = [
      {
        name: 'Entire clip',
        title: null, // do not propagate to the item
      },
    ];

    if (props.asset.mark_in || props.asset.mark_out)
      options.push({
        name: 'Marked region',
        title: null,
      });

    for (const subclip of props.asset.subclips || []) options.push(subclip);

    return (
      <>
        {options.map((option, idx) => {
          return (
            <Button
              key={idx}
              label={option.title || option.name}
              onClick={() => onConfirm([option])}
            />
          );
        })}

        <Button label="All subclips" onClick={() => onConfirm(props.asset.subclips)} />
      </>
    );
  }, [props.asset]);

  const assetTitle = props.asset.title || 'Untitled';
  const header = `Select ${assetTitle} region to append.`;

  return (
    <Dialog onHide={onCancel} header={header}>
      {body}
    </Dialog>
  );
};

export default SubclipsDialog;
