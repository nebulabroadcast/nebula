import { Button, Dialog, InputText } from '@components';
import { useState } from 'react';

interface PromptDialogProps {
  handleCancel: () => void;
  handleConfirm: (value: string) => void;
  title?: React.ReactNode;
  value?: string;
  placeholder?: string;
}

// Asks for one line of text
const PromptDialog = ({
  handleCancel,
  handleConfirm,
  title,
  value: initialValue = '',
  placeholder,
}: PromptDialogProps) => {
  const [value, setValue] = useState(initialValue);
  const onConfirm = () => {
    if (value.trim()) handleConfirm(value.trim());
  };

  const footer = (
    <>
      <Button
        onClick={handleCancel}
        label="Cancel"
        icon="close"
        hlColor="var(--color-red)"
      />
      <Button
        onClick={onConfirm}
        label="OK"
        icon="check"
        hlColor="var(--color-green)"
        disabled={!value.trim()}
      />
    </>
  );

  return (
    <Dialog onHide={handleCancel} header={title} footer={footer}>
      <InputText
        value={value}
        onChange={setValue}
        placeholder={placeholder}
        style={{ minWidth: 300 }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onConfirm();
        }}
      />
    </Dialog>
  );
};

export default PromptDialog;
