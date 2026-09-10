import { DateTime } from 'luxon';

// Parsing of spreadsheet data into asset metadata.
// Spreadsheet applications (Excel, Google Sheets, LibreOffice)
// put copied cells to the clipboard as tab separated values.

export interface IngestOption {
  value: string;
  title: string;
}

export interface IngestColumn {
  name: string; // metadata key
  title: string;
  type: string; // client metatype type (string, select...)
  mode?: string | null;
  options: IngestOption[]; // allowed values of select and list fields
}

export interface IngestCell {
  value: unknown; // null for empty and unrecognized values
  display: string;
  error?: string;
}

export type IngestRow = Record<string, IngestCell>;

export interface IngestTable {
  columns: IngestColumn[]; // recognized columns, in the pasted order
  rows: IngestRow[];
  ignored: string[]; // columns not matching any field
  headerless: boolean; // no header row, columns are in the template order
}

type Parsed = { value: unknown; display: string } | { error: string };

// Field types the metadata editor is able to edit
export const INGEST_TYPES = new Set([
  'string',
  'text',
  'integer',
  'boolean',
  'datetime',
  'timecode',
  'select',
  'list',
  'color',
]);

const BOOLEANS = new Map([
  ['1', true],
  ['true', true],
  ['yes', true],
  ['y', true],
  ['0', false],
  ['false', false],
  ['no', false],
  ['n', false],
]);

const DATETIME_FORMATS = [
  'yyyy-M-d',
  'yyyy-M-d H:mm',
  'yyyy-M-d H:mm:ss',
  "yyyy-M-d'T'H:mm",
  "yyyy-M-d'T'H:mm:ss",
  'd.M.yyyy',
  'd.M.yyyy H:mm',
  'd.M.yyyy H:mm:ss',
];

// The metadata editor edits timecodes at 25 fps as well
const TIMECODE_FPS = 25;
const TIMECODE_REGEX = /^(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)(?:[:;](\d{2}))?$/;
const INTEGER_REGEX = /^[+-]?\d+$/;
const COLOR_REGEX = /^#?([0-9a-f]{6})$/i;

const normalize = (text: string) => text.trim().toLowerCase();

// Parse tab separated values. Cells containing tabs, line breaks
// or quotes are enclosed in quotes, with the quotes inside doubled.

export const parseTsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char !== '"') {
        cell += char;
      } else if (text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = false;
      }
    } else if (char === '"' && cell === '') {
      quoted = true;
    } else if (char === '\t') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);

  // Spreadsheets usually add a trailing line break
  return rows.filter((r) => r.some((c) => c.trim()));
};

// Column headers of the template. Fields are identified by their titles,
// unless more fields share the same title.

const getTemplateHeaders = (columns: IngestColumn[]): string[] => {
  const titles = columns.map((column) => normalize(column.title));
  return columns.map((column, i) =>
    titles.indexOf(titles[i]) === titles.lastIndexOf(titles[i])
      ? column.title
      : column.name
  );
};

const getHeaderLookup = (columns: IngestColumn[]): Map<string, IngestColumn> => {
  const lookup = new Map<string, IngestColumn>();
  const headers = getTemplateHeaders(columns);
  columns.forEach((column, i) => {
    lookup.set(normalize(headers[i]), column);
  });
  // Field keys are accepted as well
  for (const column of columns) {
    if (!lookup.has(normalize(column.name))) lookup.set(normalize(column.name), column);
  }
  return lookup;
};

// Find a select option by its value or title.
// Returns an error message if there's no such option.

const matchOption = (options: IngestOption[], text: string): IngestOption | string => {
  const exact = options.find((option) => option.value === text);
  if (exact) return exact;

  const needle = normalize(text);
  const byTitle = options.filter((option) => normalize(option.title) === needle);
  if (byTitle.length === 1) return byTitle[0];
  if (byTitle.length > 1) return `"${text}" matches more than one option`;

  const byValue = options.find((option) => normalize(option.value) === needle);
  return byValue ?? `Unknown value "${text}"`;
};

const parseList = (options: IngestOption[], text: string): Parsed => {
  // A single option title may contain a comma itself
  const whole = matchOption(options, text);
  if (typeof whole !== 'string') return { value: [whole.value], display: whole.title };

  const matched: IngestOption[] = [];
  const errors: string[] = [];
  for (const item of text.split(text.includes(';') ? ';' : ',')) {
    if (!item.trim()) continue;
    const option = matchOption(options, item.trim());
    if (typeof option === 'string') errors.push(option);
    else if (!matched.includes(option)) matched.push(option);
  }
  if (errors.length) return { error: errors.join(', ') };
  return {
    value: matched.map((option) => option.value),
    display: matched.map((option) => option.title).join(', '),
  };
};

const parseDatetime = (text: string, mode?: string | null): Parsed => {
  // "10. 9. 2026" -> "10.9.2026"
  const normalized = text.replace(/\.\s+/g, '.');
  for (const format of DATETIME_FORMATS) {
    const datetime = DateTime.fromFormat(normalized, format);
    if (!datetime.isValid) continue;
    if (mode === 'date') {
      const date = datetime.startOf('day');
      return { value: date.toSeconds(), display: date.toFormat('yyyy-MM-dd') };
    }
    return {
      value: datetime.toSeconds(),
      display: datetime.toFormat('yyyy-MM-dd HH:mm:ss'),
    };
  }
  return { error: 'Unrecognized date, use YYYY-MM-DD or YYYY-MM-DD HH:MM' };
};

const parseTimecode = (text: string): Parsed => {
  const match = TIMECODE_REGEX.exec(text);
  if (match) {
    const [hours, minutes, seconds, frames] = match
      .slice(1)
      .map((part) => Number(part ?? 0));
    if (minutes < 60 && seconds < 60 && frames < TIMECODE_FPS) {
      const value = hours * 3600 + minutes * 60 + seconds + frames / TIMECODE_FPS;
      return { value, display: text };
    }
  }
  return { error: 'Unrecognized timecode, use HH:MM:SS or HH:MM:SS:FF' };
};

const parseValue = (column: IngestColumn, text: string): Parsed => {
  switch (column.type) {
    case 'integer': {
      if (!INTEGER_REGEX.test(text)) return { error: 'Not a whole number' };
      const value = parseInt(text, 10);
      return { value, display: String(value) };
    }
    case 'boolean': {
      const value = BOOLEANS.get(text.toLowerCase());
      if (value === undefined) return { error: 'Unrecognized value, use yes or no' };
      return { value, display: value ? 'Yes' : 'No' };
    }
    case 'datetime':
      return parseDatetime(text, column.mode);
    case 'timecode':
      return parseTimecode(text);
    case 'color': {
      const match = COLOR_REGEX.exec(text);
      if (!match)
        return { error: 'Unrecognized color, use a hex code such as #ff0000' };
      return { value: parseInt(match[1], 16), display: `#${match[1].toLowerCase()}` };
    }
    case 'select': {
      const option = matchOption(column.options, text);
      if (typeof option === 'string') return { error: option };
      return { value: option.value, display: option.title };
    }
    case 'list':
      return parseList(column.options, text);
    default:
      // string and text
      return { value: text, display: text };
  }
};

export const parseCell = (column: IngestColumn, raw: string): IngestCell => {
  const text = raw.trim();
  if (!text) return { value: null, display: '' };
  const parsed = parseValue(column, text);
  if ('error' in parsed) return { value: null, display: text, error: parsed.error };
  return parsed;
};

// Parse the pasted spreadsheet data. The first row is expected to be
// the header. If none of its cells match a field, there's no header
// and the columns are expected in the template order.

export const parseSpreadsheet = (
  text: string,
  columns: IngestColumn[]
): IngestTable => {
  const lines = parseTsv(text);
  const lookup = getHeaderLookup(columns);
  const header = lines.length ? lines[0] : [];
  const headerless = !header.some((cell) => lookup.has(normalize(cell)));

  const ignored: string[] = [];
  let mapping: Array<IngestColumn | undefined>;

  if (headerless) {
    const width = Math.max(0, ...lines.map((line) => line.length));
    mapping = Array.from({ length: width }, (_, i) => columns[i]);
    for (let i = columns.length; i < width; i++) ignored.push(`Column ${i + 1}`);
  } else {
    const used = new Set<IngestColumn>();
    mapping = header.map((cell) => {
      const column = lookup.get(normalize(cell));
      if (column && !used.has(column)) {
        used.add(column);
        return column;
      }
      if (cell.trim()) ignored.push(cell.trim());
      return undefined;
    });
  }

  const rows = (headerless ? lines : lines.slice(1)).map((line) => {
    const row: IngestRow = {};
    mapping.forEach((column, i) => {
      if (column) row[column.name] = parseCell(column, line[i] ?? '');
    });
    return row;
  });

  return {
    columns: mapping.filter((column) => column !== undefined),
    rows,
    ignored,
    headerless,
  };
};

//
// Template
//

// Cells with tabs, line breaks or quotes are enclosed in quotes
const escapeTsv = (text: string) =>
  /[\t\n\r"]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;

const formatTimecode = (seconds: number): string => {
  const frames = Math.round(seconds * TIMECODE_FPS);
  return [
    Math.floor(frames / (3600 * TIMECODE_FPS)),
    Math.floor(frames / (60 * TIMECODE_FPS)) % 60,
    Math.floor(frames / TIMECODE_FPS) % 60,
    frames % TIMECODE_FPS,
  ]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
};

// Option title, or the value itself if the title
// wouldn't be recognized as this option when pasted back

const formatOption = (options: IngestOption[], value: string): string => {
  const option = options.find((opt) => opt.value === value);
  if (option && matchOption(options, option.title) === option) return option.title;
  return value;
};

// Format a metadata value the way parseCell reads it back

const formatCell = (column: IngestColumn, value: unknown): string => {
  if (value === null || value === undefined) return '';
  switch (column.type) {
    case 'boolean':
      return value ? 'yes' : 'no';
    case 'datetime': {
      if (typeof value !== 'number' || !value) return '';
      const datetime = DateTime.fromSeconds(value);
      if (column.mode === 'date') return datetime.toFormat('yyyy-MM-dd');
      return datetime.toFormat(
        datetime.second ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd HH:mm'
      );
    }
    case 'timecode':
      return typeof value === 'number' && value ? formatTimecode(value) : '';
    case 'color':
      return typeof value === 'number' && value
        ? `#${value.toString(16).padStart(6, '0')}`
        : '';
    case 'select':
      return typeof value === 'string' ? formatOption(column.options, value) : '';
    case 'list': {
      if (!Array.isArray(value)) return '';
      const items = value.map((item) => formatOption(column.options, String(item)));
      return items.join(items.some((item) => item.includes(',')) ? '; ' : ', ');
    }
    default:
      // string, text and integer
      return typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : '';
  }
};

// Tab separated template to paste into a spreadsheet: the header row
// and optionally an example row with the metadata of an existing asset

export const getTemplate = (
  columns: IngestColumn[],
  example?: Record<string, unknown>
): string => {
  const rows = [getTemplateHeaders(columns)];
  if (example) {
    rows.push(columns.map((column) => formatCell(column, example[column.name])));
  }
  return rows.map((row) => row.map(escapeTsv).join('\t')).join('\n');
};
