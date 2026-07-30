import { Button, Dialog, ErrorBanner } from '@components';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';

import type { ActionItemModel } from '../../client';

import nebula from '@/nebula';

interface SendToDialogProps {
  assets: number[];
  handleCancel: () => void;
  handleConfirm: (data?: any) => void;
  title: React.ReactNode;
  cancelLabel?: string;
}

const SendToDialog = ({
  assets,
  handleCancel,
  handleConfirm,
  title,
  cancelLabel,
}: SendToDialogProps) => {
  const [sendToOptions, setSendToOptions] = useState<ActionItemModel[] | null>(null);
  const [dialogShow, setDialogShow] = useState(false);

  const onCancel = () => {
    handleCancel();
  };
  const onConfirm = (action: number) => {
    nebula
      .send({ body: { ids: assets, id_action: action }, throwOnError: true })
      .then(() => {
        toast.success('Job request accepted');
      })
      .catch((error) => {
        toast.error(error.response?.data?.detail || 'An error occurred');
      })
      .finally(() => {
        handleConfirm();
      });
  };

  const body = useMemo(() => {
    if (!sendToOptions) return null;
    if (sendToOptions.length === 0) {
      return <ErrorBanner>No actions available for the current selection</ErrorBanner>;
    }
    return (
      <>
        {sendToOptions.map((option) => {
          return (
            <Button
              key={option.id}
              label={option.name}
              onClick={() => {
                onConfirm(option.id);
              }}
            />
          );
        })}
      </>
    );
  }, [sendToOptions]);

  useEffect(() => {
    const body = document.querySelector('body');
    if (body) {
      body.style.cursor = 'wait !important';
    }

    nebula
      .actions({ body: { ids: assets }, throwOnError: true })
      .then((response) => {
        setSendToOptions(response.data.actions || []);
      })
      .catch(() => {
        setSendToOptions([]);
      })
      .finally(() => {
        setDialogShow(true);
        if (body) {
          body.style.cursor = 'default';
        }
      });
  }, [assets]);

  const footer = (
    <>
      <Button
        onClick={onCancel}
        label={cancelLabel || 'Cancel'}
        icon="close"
        hlColor="var(--color-red)"
      />
    </>
  );

  if (!dialogShow) {
    return;
  }

  return (
    <Dialog onHide={onCancel} header={title} footer={footer}>
      {body}
    </Dialog>
  );
};

export default SendToDialog;
