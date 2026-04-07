import { Dialog, Table, Button, Icon } from '@components';
import type { TableColumn, TableRowData } from '@components/table/types';
import formatMetaDatetime from '@lib/tableFormat/formatMetaDatetime';
import { formatTimeString } from '@lib/utils';
import React, { AnchorHTMLAttributes } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
import styled from 'styled-components';

const MarkdownWrapper = styled.div`
  padding: 12px;
`;

const UriWrapper = styled.div`
  display: inline-flex;
  gap: 2px;
  padding: 0;

  a {
    text-decoration: none;
    text-transform: none;
    color: #885bff;
    user-select: all;

    &:hover {
      text-decoration: underline;
      color: #a47bff;
    }
  }

  button {
    border: none;
    background: none;
    padding: 0;
    margin: 0;
    color: #885bff;
    cursor: pointer;
    width: 10px;
    height: 10px;
  }
`;

interface UriComponentProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
}

const UriComponent: React.FC<UriComponentProps> = ({ children, ...props }) => {
  return (
    <UriWrapper>
      <a {...props}>{children}</a>
      <button
        onClick={() => {
          if (props.href) {
            navigator.clipboard.writeText(props.href);
            toast.success('Copied to clipboard');
          }
        }}
      >
        <Icon icon="content_copy" />
      </button>
    </UriWrapper>
  );
};

interface ExtendedTableColumn extends TableColumn {
  type?: string;
  title: string;
}

interface TablePayload {
  columns: ExtendedTableColumn[];
  data: TableRowData[];
}

interface TableDialogProps {
  onHide: () => void;
  dialogStyle?: React.CSSProperties;
  header?: string;
  payload: TablePayload;
}

const TableDialog: React.FC<TableDialogProps> = ({
  onHide,
  dialogStyle,
  header,
  payload,
}) => {
  const columns: TableColumn[] = payload.columns.map((column) => {
    if (column.type === 'datetime') {
      column.formatter = formatMetaDatetime;
    }
    return column;
  });

  const onCopy = () => {
    const data = payload.data.map((row) => {
      const newRow: TableRowData = {};
      payload.columns.forEach((column) => {
        if (column.type === 'datetime') {
          newRow[column.name] = formatTimeString(row[column.name]);
        } else {
          newRow[column.name] = row[column.name];
        }
      });
      return newRow;
    });

    const columnHeaders = payload.columns.map((column) => column.title);
    const columnHeadersString = columnHeaders.join('\t');
    const dataString = data
      .map((row) => {
        return payload.columns
          .map((column) => {
            return row[column.name];
          })
          .join('\t');
      })
      .join('\n');

    const clipboardText = columnHeadersString + '\n' + dataString;
    navigator.clipboard.writeText(clipboardText);
    toast.success('Copied to clipboard');
  };

  return (
    <Dialog
      onHide={onHide}
      style={dialogStyle || { height: '80%', width: '60%' }}
      header={header}
      footer={
        <>
          <Button onClick={onCopy} icon="content_copy" label="Copy to clipboard" />
          <Button
            onClick={() => {
              onHide();
            }}
            icon="close"
            label="Cancel"
          />
        </>
      }
    >
      <div style={{ position: 'relative', flexGrow: 1 }}>
        <Table columns={columns} data={payload.data} className="contained" />
      </div>
    </Dialog>
  );
};

interface ContextActionResultProps {
  mime: string;
  payload: any;
  onHide: () => void;
}

const ContextActionResult: React.FC<ContextActionResultProps> = ({
  mime,
  payload,
  onHide,
}) => {
  if (mime === 'text/markdown') {
    const components = {
      a: UriComponent as any,
    };
    return (
      <Dialog onHide={onHide}>
        <MarkdownWrapper>
          <ReactMarkdown components={components}>{payload}</ReactMarkdown>
        </MarkdownWrapper>
      </Dialog>
    );
  } // End of text/markdown

  if (mime === 'application/json') {
    if (payload.type === 'table') {
      return (
        <TableDialog
          onHide={onHide}
          header={payload.header}
          dialogStyle={payload.dialog_style}
          payload={payload.payload}
        />
      );
    } // End of table mode
  } // End of application/json

  return null;
};

export default ContextActionResult;
