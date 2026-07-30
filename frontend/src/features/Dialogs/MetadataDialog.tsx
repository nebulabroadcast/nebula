import { Button, Dialog } from '@components';
import MetadataEditor from '@containers/MetadataEditor';
import { useState } from 'react';

import type { ClientMetaTypeModel } from '../../client';

interface MetadataDialogProps {
  initialData: Record<string, any>;
  handleCancel: () => void;
  handleConfirm: (data: Record<string, any>) => void;
  title: React.ReactNode;
  fields: Array<ClientMetaTypeModel & { name: string }>;
}

const MetadataDialog = ({
  initialData,
  handleCancel,
  handleConfirm,
  title,
  fields,
}: MetadataDialogProps) => {
  const [data, setData] = useState(initialData);

  const onReset = () => { setData(initialData); };
  const onCancel = () => { handleCancel(); };
  const onConfirm = () => { handleConfirm(data); };

  const footer = (
    <>
      <Button onClick={onReset} label="Reset" icon="backspace" />
      <Button
        onClick={onCancel}
        label="Cancel"
        icon="close"
        hlColor="var(--color-red)"
      />
      <Button
        onClick={onConfirm}
        label="Save"
        icon="check"
        hlColor="var(--color-green)"
      />
    </>
  );

  return (
    <Dialog onHide={onCancel} header={title} footer={footer}>
      <MetadataEditor
        originalData={initialData}
        objectData={data}
        setObjectData={setData}
        fields={fields}
        onSave={onConfirm}
      />
    </Dialog>
  );
};

export default MetadataDialog;
