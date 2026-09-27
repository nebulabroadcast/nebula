import { useState, useRef, ReactNode, ComponentType } from 'react';

import { DialogContext } from './context';
import { dialogs, type DialogType, type ShowDialog } from './registry';

interface OpenDialog {
  type: DialogType;
  props: Record<string, unknown>;
}

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const promiseRef = useRef<{
    resolve: (data: unknown) => void;
    reject: (reason: Error) => void;
  } | null>(null);
  const [openDialog, setOpenDialog] = useState<OpenDialog | null>(null);

  const handleConfirm = (data: unknown) => {
    console.log('Dialog confirmed with data', data);
    promiseRef.current?.resolve(data);
    cleanup();
  };

  const handleCancel = () => {
    console.log('Dialog cancelled');
    promiseRef.current?.reject(new Error('Dialog cancelled'));
    cleanup();
  };

  const cleanup = () => {
    setOpenDialog(null);
    promiseRef.current = null;
  };

  const execute: ShowDialog = (dialogType, title, props) =>
    new Promise((resolve, reject) => {
      promiseRef.current = {
        resolve: resolve as (data: unknown) => void,
        reject,
      };
      setOpenDialog({
        type: dialogType,
        props: { title, handleConfirm, handleCancel, ...props },
      });
    });

  // props are matched to the dialog type in execute(), so the component
  // can be rendered with the stored props as-is
  const DialogComponent = openDialog
    ? (dialogs[openDialog.type] as unknown as ComponentType<Record<string, unknown>>)
    : null;

  return (
    <DialogContext.Provider value={{ execute }}>
      {children}
      {openDialog && DialogComponent && <DialogComponent {...openDialog.props} />}
    </DialogContext.Provider>
  );
};
