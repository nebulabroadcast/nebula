import DatePickerDialog from '@components/DatePickerDialog';
import type { ComponentProps } from 'react';

import ConfirmDialog from './ConfirmDialog';
import MetadataDialog from './MetadataDialog';
import SendToDialog from './SendToDialog';
import SeriesScheduleDialog from './SeriesScheduleDialog';
import SpreadsheetIngestDialog from './SpreadsheetIngestDialog';
import SubclipsDialog from './SubclipsDialog';

// Every dialog gets title, handleConfirm and handleCancel from the provider.
// The rest of its props are passed to showDialog(), and the value it hands
// to handleConfirm is what the returned promise resolves with.
export const dialogs = {
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

export type ShowDialog = <K extends DialogType>(
  dialogType: K,
  title: string,
  props: DialogProps<K>
) => Promise<DialogResult<K>>;
