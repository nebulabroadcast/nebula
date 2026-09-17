import { Button, Dialog, Spacer } from '@components';
import { useNebula } from '@features/Nebula';
import { AxiosError } from 'axios';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import styled from 'styled-components';

import {
  getTemplate,
  INGEST_TYPES,
  parseSpreadsheet,
  type IngestColumn,
} from './spreadsheetIngest';

import type { OperationResult } from '@/client';
import nebula from '@/nebula';

import '@components/table/Table.css';

const CLIPBOARD_ERROR =
  'The clipboard is not accessible. Press Ctrl+V to paste instead.';

const Instructions = styled.div`
  line-height: 1.5;

  ol {
    margin: 0;
    padding-left: 20px;
  }

  li {
    margin-bottom: 6px;
  }
`;

const Notices = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  p {
    margin: 0;
  }

  .warning {
    color: var(--color-yellow);
  }

  .error {
    color: var(--color-red);
    white-space: pre-line;
  }
`;

const Preview = styled.div`
  position: relative;
  flex-grow: 1;
  min-height: 200px;

  .nb-table table {
    tbody tr {
      cursor: default;
    }

    td.invalid {
      color: var(--color-red);
    }

    /* Long texts are truncated. max-width is not reliable on table cells,
       so it's set on their content */
    td .value {
      display: block;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    tr.created td {
      opacity: 0.4;
    }

    tr.failed {
      border-left-color: var(--color-red);
    }
  }
`;

// Template columns: folder fields that can be ingested and the duration.
// Field settings override the metatype ones, as in the metadata editor.

const getIngestColumns = (folderId: number): IngestColumn[] => {
  const folder = nebula.settings?.folders?.find((f) => f.id === folderId);
  const columns: IngestColumn[] = [];
  for (const field of folder?.fields ?? []) {
    const metaType = { ...nebula.metaType(field.name), ...field };
    const type = metaType.type ?? 'string';
    if (!INGEST_TYPES.has(type)) continue;

    // Only the options the select dialog offers
    let options = metaType.cs ? nebula.csOptions(metaType.cs) : [];
    options = options.filter((opt) => opt.role !== 'hidden' && opt.role !== 'label');
    if (metaType.filter) {
      const filter = new RegExp(metaType.filter);
      options = options.filter((opt) => filter.test(opt.value));
    }

    columns.push({
      name: field.name,
      title: metaType.title,
      type,
      mode: metaType.mode,
      options: options.map(({ value, title }) => ({ value, title })),
    });
  }

  // Duration is set in the main bar of the asset editor, not in the folder form
  if (!columns.some((column) => column.name === 'duration')) {
    columns.push({
      name: 'duration',
      title: nebula.metaType('duration').title,
      type: 'timecode',
      options: [],
    });
  }
  return columns;
};

const getErrorDetail = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { detail?: string } | undefined;
    if (data?.detail) return data.detail;
  }
  return 'Unknown error';
};

const pluralize = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

interface SpreadsheetIngestDialogProps {
  folderId: number;
  // metadata of an existing asset, used as an example row of the template
  example?: Record<string, unknown>;
  title: React.ReactNode;
  handleCancel: () => void;
  handleConfirm: (ids: number[]) => void;
}

const SpreadsheetIngestDialog = ({
  folderId,
  example,
  title,
  handleCancel,
  handleConfirm,
}: SpreadsheetIngestDialogProps) => {
  const { reloadBrowser } = useNebula();
  const [pasted, setPasted] = useState('');
  // Results of the rows sent to the server, by row index.
  // Rows which have been created are not sent again on retry.
  const [results, setResults] = useState(() => new Map<number, OperationResult>());
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const columns = useMemo(() => getIngestColumns(folderId), [folderId]);
  const table = useMemo(() => parseSpreadsheet(pasted, columns), [pasted, columns]);

  const pendingRows = useMemo(
    () =>
      table.rows
        .map((row, index) => ({ row, index }))
        .filter(({ index }) => !results.get(index)?.success),
    [table, results]
  );

  const invalidCount = pendingRows.reduce(
    (count, { row }) => count + Object.values(row).filter((cell) => cell.error).length,
    0
  );

  const createdCount = [...results.values()].filter((result) => result.success).length;
  const failures = [...results.entries()].filter(([, result]) => result.error);

  // Clipboard

  const loadData = useCallback(
    (text: string) => {
      if (submitting) return;
      setPasted(text);
      setResults(new Map());
      setError(null);
    },
    [submitting]
  );

  useEffect(() => {
    // Ctrl+V works even where the clipboard API is not available
    const onPaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData('text/plain');
      if (!text) return;
      event.preventDefault();
      loadData(text);
    };
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('paste', onPaste);
    };
  }, [loadData]);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => {
      setCopied(false);
    }, 2000);
    return () => {
      clearTimeout(timeout);
    };
  }, [copied]);

  const onCopyTemplate = () => {
    if (!navigator.clipboard?.writeText) {
      setError('The clipboard is not accessible.');
      return;
    }
    navigator.clipboard
      .writeText(getTemplate(columns, example))
      .then(() => {
        setCopied(true);
      })
      .catch(() => {
        setError('The clipboard is not accessible.');
      });
  };

  const onPasteClick = () => {
    if (!navigator.clipboard?.readText) {
      setError(CLIPBOARD_ERROR);
      return;
    }
    navigator.clipboard
      .readText()
      .then(loadData)
      .catch(() => {
        setError(CLIPBOARD_ERROR);
      });
  };

  // Submit

  const onCancel = () => {
    if (submitting) return;
    handleCancel();
  };

  const onSubmit = () => {
    if (submitting || !pendingRows.length) return;

    // Empty and unrecognized values are left unset
    const operations = pendingRows.map(({ row }) => {
      const data: Record<string, unknown> = { id_folder: folderId };
      for (const [key, cell] of Object.entries(row)) {
        if (cell.value !== null) data[key] = cell.value;
      }
      return { data };
    });

    setSubmitting(true);
    setError(null);
    nebula
      .ops({ body: { operations }, throwOnError: true })
      .then((response) => {
        const newResults = new Map(results);
        response.data.operations.forEach((result, i) => {
          newResults.set(pendingRows[i].index, result);
        });
        setResults(newResults);

        if (response.data.operations.some((result) => result.success)) {
          reloadBrowser();
        }
        if (!response.data.success) return; // keep the dialog open to retry

        const ids = [...newResults.values()]
          .map((result) => result.id)
          .filter((id) => id != null);
        toast.success(`Created ${pluralize(ids.length, 'asset')}`);
        handleConfirm(ids);
      })
      .catch((err: unknown) => {
        setError(`Unable to create assets: ${getErrorDetail(err)}`);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  // Render

  const hasRows = table.rows.length > 0;

  const footer = (
    <>
      <Button
        icon={copied ? 'check' : 'content_copy'}
        label={copied ? 'Copied' : 'Copy template'}
        tooltip="Copy the column headers to paste them into a spreadsheet"
        onClick={onCopyTemplate}
      />
      <Button
        icon="content_paste"
        label="Paste"
        tooltip="Paste the cells copied from a spreadsheet"
        onClick={onPasteClick}
        disabled={submitting}
      />
      <Spacer />
      <Button
        icon="close"
        label="Cancel"
        onClick={onCancel}
        disabled={submitting}
        hlColor="var(--color-red)"
      />
      <Button
        icon="check"
        label={
          pendingRows.length
            ? `Create ${pluralize(pendingRows.length, 'asset')}`
            : 'Create assets'
        }
        onClick={onSubmit}
        disabled={submitting || !pendingRows.length}
        hlColor="var(--color-green)"
      />
    </>
  );

  return (
    <Dialog
      onHide={onCancel}
      header={title}
      footer={footer}
      style={hasRows ? { width: '85%', height: '80%' } : { width: 600 }}
    >
      {!hasRows && (
        <Instructions>
          <ol>
            <li>
              Copy the template and paste it into Excel or Google Sheets. It has a
              column for each field of the folder and for the duration.
              {example && (
                <>
                  {' '}
                  The second row is an example taken from the current asset. Replace or
                  delete it, otherwise a copy of the asset will be created.
                </>
              )}
            </li>
            <li>
              Fill in one row per asset. Select fields accept both labels and values,
              separate multiple values with commas. Enter durations as HH:MM:SS or
              HH:MM:SS:FF and dates as YYYY-MM-DD or YYYY-MM-DD HH:MM.
            </li>
            <li>
              Copy the filled cells including the header row, and paste them here using
              the Paste button or Ctrl+V.
            </li>
          </ol>
        </Instructions>
      )}

      <Notices>
        {pasted && !hasRows && (
          <p className="error">No rows were found in the pasted data.</p>
        )}
        {hasRows && table.headerless && (
          <p className="warning">
            No header row was found, so the columns are expected in the template order.
          </p>
        )}
        {table.ignored.length > 0 && (
          <p className="warning">Ignored columns: {table.ignored.join(', ')}</p>
        )}
        {invalidCount > 0 && (
          <p className="warning">
            {pluralize(invalidCount, 'value')} could not be recognized. They are shown
            in red and will be left empty.
          </p>
        )}
        {failures.length > 0 && (
          <p className="error">
            {`Created ${createdCount} of ${pluralize(table.rows.length, 'asset')}. `}
            {'Failed rows can be retried. When pasting corrected data, '}
            {'leave out the rows that have been created.'}
            {failures
              .slice(0, 5)
              .map(([index, result]) => `\nRow ${index + 1}: ${result.error}`)}
            {failures.length > 5 && `\n...and ${failures.length - 5} more`}
          </p>
        )}
        {error && <p className="error">{error}</p>}
      </Notices>

      {hasRows && (
        <Preview>
          <div className="nb-table contained">
            <table>
              <thead>
                <tr>
                  <th>
                    <div>#</div>
                  </th>
                  {table.columns.map((column) => (
                    <th key={column.name}>
                      <div>{column.title}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, index) => {
                  const result = results.get(index);
                  return (
                    <tr
                      key={index}
                      className={clsx({
                        created: result?.success,
                        failed: result?.error,
                      })}
                    >
                      <td className="dim" data-tooltip={result?.error ?? undefined}>
                        {index + 1}
                      </td>
                      {table.columns.map((column) => {
                        const cell = row[column.name];
                        return (
                          <td
                            key={column.name}
                            className={clsx({ invalid: cell.error })}
                            data-tooltip={cell.error}
                          >
                            <span className="value">{cell.display}</span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Preview>
      )}
    </Dialog>
  );
};

export default SpreadsheetIngestDialog;
