import DatePickerDialog from '@components/DatePickerDialog';
import {
  createContext,
  useState,
  useRef,
  useContext,
  useMemo,
  ReactNode,
  ComponentType,
} from 'react';

import ConfirmDialog from './ConfirmDialog';
import MetadataDialog from './MetadataDialog';
import SendToDialog from './SendToDialog';
import SeriesScheduleDialog from './SeriesScheduleDialog';
import SubclipsDialog from './SubclipsDialog';

interface DialogContextType {
  execute: (dialogType: string, title: string, props: any) => Promise<any>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const promiseRef = useRef<{
    resolve: (data: any) => void;
    reject: (reason: any) => void;
  } | null>(null);
  const dialogProps = useRef<any>({});
  const [dialogType, setDialogType] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const handleConfirm = (data: any) => {
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
    setVisible(false);
    setDialogType(null);
    promiseRef.current = null;
  };

  const execute = (dialogType: string, title: string, props: any) =>
    new Promise((resolve, reject) => {
      dialogProps.current = {
        title,
        handleConfirm,
        handleCancel,
        ...props,
      };

      promiseRef.current = { resolve, reject };
      setDialogType(dialogType);
      setVisible(true);
    });

  const DialogComponent = useMemo(() => {
    switch (dialogType) {
      case 'confirm':
        return ConfirmDialog as ComponentType<any>;
      case 'metadata':
        return MetadataDialog as ComponentType<any>;
      case 'sendto':
        return SendToDialog as ComponentType<any>;
      case 'date':
        return DatePickerDialog as ComponentType<any>;
      case 'subclips':
        return SubclipsDialog as ComponentType<any>;
      case 'seriesSchedule':
        return SeriesScheduleDialog as ComponentType<any>;
      default:
        return null;
    }
  }, [dialogType]);

  return (
    <DialogContext.Provider value={{ execute }}>
      {children}
      {visible && DialogComponent && <DialogComponent {...dialogProps.current} />}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context.execute;
};
