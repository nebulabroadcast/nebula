import { Button, Dialog } from '@components';
import { useMemo } from 'react';

interface Subclip {
  title?: string;
  name?: string;
  mark_in?: number | null;
  mark_out?: number | null;
}

interface Asset {
  title?: string;
  mark_in?: number | null;
  mark_out?: number | null;
  subclips?: Subclip[];
}

interface SubclipsDialogProps {
  asset: Asset;
  handleCancel: () => void;
  handleConfirm: (options: Subclip[] | undefined) => void;
}

const SubclipsDialog = ({
  asset,
  handleCancel,
  handleConfirm,
}: SubclipsDialogProps) => {
  const onCancel = () => handleCancel();
  const onConfirm = (option: Subclip[]) => handleConfirm(option);

  const body = useMemo(() => {
    const options: Subclip[] = [
      {
        name: 'Entire clip',
        title: undefined, // do not propagate to the item
      },
    ];

    if (asset.mark_in || asset.mark_out)
      options.push({
        name: 'Marked region',
        title: undefined,
      });

    for (const subclip of asset.subclips || []) options.push(subclip);

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

        <Button label="All subclips" onClick={() => onConfirm(asset.subclips || [])} />
      </>
    );
  }, [asset]);

  const assetTitle = asset.title || 'Untitled';
  const header = `Select ${assetTitle} region to append.`;

  return (
    <Dialog onHide={onCancel} header={header}>
      {body}
    </Dialog>
  );
};

export default SubclipsDialog;
