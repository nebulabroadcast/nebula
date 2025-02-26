import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';

import nebula from '/src/nebula';
import { Button, Dialog, ErrorBanner } from '/src/components';

const SendToDialog = (props) => {
  const [sendToOptions, setSendToOptions] = useState(null);

  const onCancel = () => props.handleCancel();
  const onConfirm = (action) => {
    nebula
      .request('send', { ids: props.assets, id_action: action })
      .then(() => {
        toast.success('Job request accepted');
      })
      .catch((error) => {
        toast.error(error.response.detail);
      })
      .finally(() => {
        props.handleConfirm();
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
              onClick={() => onConfirm(option.id)}
            />
          );
        })}
      </>
    );
  }, [sendToOptions]);

  const loadOptions = () => {
    nebula
      .request('actions', { ids: props.assets })
      .then((response) => {
        setSendToOptions(response.data.actions);
      })
      .catch(() => {
        sendToOptions([]);
      });
  };
  useEffect(() => {
    loadOptions();
  }, [props.assets]);

  const footer = (
    <>
      <Button
        onClick={onCancel}
        label={props.cancelLabel || 'Cancel'}
        icon="close"
        hlColor="var(--color-red)"
      />
    </>
  );

  return (
    <Dialog onHide={onCancel} header={props.title} footer={footer}>
      {body}
    </Dialog>
  );
};

export default SendToDialog;
