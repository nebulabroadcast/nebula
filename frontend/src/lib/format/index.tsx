import './cellStyles.scss';

import { TableRowData, TableCellFormatter } from '@components/table/types';

import formatAuthorship from './formatAuthorship';
import formatMetaDatetime from './formatMetaDatetime';
import formatMetaTimecode from './formatMetaTimecode';
import formatObjectDuration from './formatObjectDuration';
import formatObjectIdFolder from './formatObjectIdFolder';
import formatObjectQcState from './formatObjectQcState';
import formatObjectStatus from './formatObjectStatus';
import formatObjectTitle, { formatTitleWithThumbnail } from './formatObjectTitle';
import formatRundownDifference from './formatRundownDifference';
import formatRundownRunMode from './formatRundownRunMode';
import formatRundownSymbol from './formatRundownSymbol';
import formatRundownTime from './formatRundownTime';

import nebula from '@/nebula';

const formatRowHighlightColor = (rowData: TableRowData) => {
  switch (rowData.status) {
    case 0:
      return 'var(--color-red)';
    case 2:
      return 'var(--color-yellow)'; // creating
    case 3:
      return 'var(--color-violet)'; // trashed
    case 4:
      return 'var(--color-blue)'; // archived
    case 5:
      return 'var(--color-yellow)'; // reset
    case 6:
      return 'var(--color-red)'; // corrupted
    case 7:
      return 'var(--color-yellow)'; // ready
    case 11:
      return 'var(--color-yellow)'; // retrieving
    default:
      return 'transparent';
  }
};

const formatRowHighlightStyle = (rowData: TableRowData) => {
  switch (rowData.status) {
    case 5:
      return 'dashed';
    case 6:
      return 'dashed';
    case 7:
      return 'dashed';
    default:
      return 'solid';
  }
};

// Column width and cell class

const getColumnWidth = (key: string) => {
  if (!['title', 'subtitle', 'description'].includes(key)) return '1px';
};

const getColumnClassName = (key: string) => {
  if (key === 'rundown_symbol') return 'symbol';
};

// Field formatters

const getDefaultFormatter = (key: string): TableCellFormatter => {
  const metaType = nebula.metaType(key);
  switch (metaType.type) {
    case 'boolean':
      return (rowData, key) => (rowData[key] ? '✓' : '');

    case 'datetime':
      return (rowData, key) =>
        formatMetaDatetime(rowData, key, metaType.mode as 'date' | 'time' | 'datetime');

    case 'timecode':
      return (rowData, key) => formatMetaTimecode(rowData, key);

    case 'select':
      return (rowData, key) => {
        if (!metaType.cs) return rowData[key] as string;

        const option = nebula
          .csOptions(metaType.cs)
          .find((opt) => opt.value === rowData[key]);

        return option?.title;
      };

    case 'list':
      return (rowData, key) => {
        const values = (rowData[key] as string[]) || [];
        if (!metaType.cs) return values.join(', ');
        const options = nebula
          .csOptions(metaType.cs)
          .filter((opt) => values.includes(opt.value));
        return options.map((opt) => opt.title).join(', ');
      };

    default:
      return (rowData, key) => rowData[key] as React.ReactNode;
  } // switch metaType
};

const getFormatter = (key: string): TableCellFormatter => {
  if (['subtitle', 'description'].includes(key))
    return (rowData, key) => rowData[key] as React.ReactNode;

  switch (key) {
    case 'title':
      return formatObjectTitle;
    case 'qc/state':
      return formatObjectQcState;
    case 'id_folder':
      return formatObjectIdFolder;
    case 'status':
      return formatObjectStatus;
    case 'duration':
      return formatObjectDuration;
    case 'rundown_symbol':
      return formatRundownSymbol;
    case 'scheduled_time':
      return formatRundownTime;
    case 'broadcast_time':
      return formatRundownTime;
    case 'run_mode':
      return formatRundownRunMode;
    case 'created_by':
      return formatAuthorship;
    case 'updated_by':
      return formatAuthorship;

    default:
      return getDefaultFormatter(key);
  } // end switch key
}; // end getFormatter

export {
  formatRundownDifference,
  formatTitleWithThumbnail,
  getColumnClassName,
  getColumnWidth,
  getFormatter,
  formatRowHighlightColor,
  formatRowHighlightStyle,
};
