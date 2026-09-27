import DatePickerDialog from '@components/DatePickerDialog';
import {
  createContext,
  useState,
  useRef,
  useContext,
  ReactNode,
  ComponentProps,
  ComponentType,
} from 'react';

import ConfirmDialog from './ConfirmDialog';
import MetadataDialog from './MetadataDialog';
import SendToDialog from './SendToDialog';
import SeriesScheduleDialog from './SeriesScheduleDialog';
import SpreadsheetIngestDialog from './SpreadsheetIngestDialog';
import SubclipsDialog from './SubclipsDialog';

// Every dialog gets title, handleConfirm and handleCancel from the provider.
// The rest of its props are passed to showDialog(), and the value it hands
// to handleConfirm is what the returned promise resolves with.
const dialogs = {
  confirm: ConfirmDialog,
  metadata: MetadataDialog,
  sendto: SendToDialog,
  date: DatePickerDialog,
  subclips: SubclipsDialog,
  seriesSchedule: SeriesScheduleDialog,
  spreadsheet: SpreadsheetIngestDialog,
};

export type DialogType = keyof typeof dialogs;

type PropsOf<K extends DialogType> = ComponentProps<(typeof dialogs)[K]>;

export type DialogProps<K extends DialogType> = Omit<
  PropsOf<K>,
  'title' | 'handleConfirm' | 'handleCancel'
>;

export type DialogResult<K extends DialogType> = Parameters<
  PropsOf<K>['handleConfirm']
>[0];

type ShowDialog = <K extends DialogType>(
  dialogType: K,
  title: string,
  props: DialogProps<K>
) => Promise<DialogResult<K>>;

interface DialogContextType {
  execute: ShowDialog;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const promiseRef = useRef<{
    resolve: (data: unknown) => void;
    reject: (reason: Error) => void;
  } | null>(null);
  const dialogProps = useRef<Record<string, unknown>>({});
  const [dialogType, setDialogType] = useState<DialogType | null>(null);
  const [visible, setVisible] = useState(false);

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
    setVisible(false);
    setDialogType(null);
    promiseRef.current = null;
  };

  const execute: ShowDialog = (dialogType, title, props) =>
    new Promise((resolve, reject) => {
      dialogProps.current = {
        title,
        handleConfirm,
        handleCancel,
        ...props,
      };

      promiseRef.current = {
        resolve: resolve as (data: unknown) => void,
        reject,
      };
      setDialogType(dialogType);
      setVisible(true);
    });

  // props are matched to the dialog type in execute(), so the component
  // can be rendered with the stored props as-is
  const DialogComponent = dialogType
    ? (dialogs[dialogType] as unknown as ComponentType<Record<string, unknown>>)
    : null;

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
