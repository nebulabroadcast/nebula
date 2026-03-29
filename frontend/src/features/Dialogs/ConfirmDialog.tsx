import { Button, Dialog } from '@components';
import ReactMarkdown from 'react-markdown';

interface ConfirmDialogProps {
  handleCancel: () => void;
  handleConfirm: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  title?: React.ReactNode;
  message: string;
}

const ConfirmDialog = ({
  handleCancel,
  handleConfirm,
  cancelLabel,
  confirmLabel,
  title,
  message,
}: ConfirmDialogProps) => {
  const onCancel = () => handleCancel();
  const onConfirm = () => handleConfirm();

  const footer = (
    <>
      <Button
        onClick={onCancel}
        label={cancelLabel || 'Cancel'}
        icon="close"
        hlColor="var(--color-red)"
      />
      <Button
        onClick={onConfirm}
        label={confirmLabel || 'Confirm'}
        icon="check"
        hlColor="var(--color-green)"
      />
    </>
  );

  return (
    <Dialog onHide={onCancel} header={title} footer={footer}>
      <ReactMarkdown>{message}</ReactMarkdown>
    </Dialog>
  );
};

export default ConfirmDialog;
