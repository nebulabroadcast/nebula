import ReactMarkdown from 'react-markdown'
import { Dialog, Table, Button } from '/src/components'
import styled from 'styled-components'
import { toast } from 'react-toastify'
import { formatTimeString } from '/src/utils'
import formatMetaDatetime from '/src/tableFormat/formatMetaDatetime'

const MarkdownWrapper = styled.div`
  padding: 12px;
`

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
`

const UriComponent = ({ children, ...props }) => {
  return (
    <UriWrapper>
      <a {...props}>{children}</a>
      <button
        onClick={() => {
          navigator.clipboard.writeText(props.href)
          toast.success('Copied to clipboard')
        }}
      >
        <span className="icon material-symbols-outlined">content_copy</span>
      </button>
    </UriWrapper>
  )
}

const TableDialog = ({ onHide, dialogStyle, header, payload }) => {
  const columns = payload.columns.map((column) => {
    if (column.type === 'datetime') {
      column.formatter = formatMetaDatetime
    }
    return column
  })

  const onCopy = () => {
    const data = payload.data.map((row) => {
      const newRow = {}
      columns.forEach((column) => {
        if (column.type === 'datetime') {
          newRow[column.name] = formatTimeString(row[column.name])
        } else {
          newRow[column.name] = row[column.name]
        }
      })
      return newRow
    })

    const columnHeaders = columns.map((column) => column.title)
    const columnHeadersString = columnHeaders.join('\t')
    const dataString = data
      .map((row) => {
        return columns
          .map((column) => {
            return row[column.name]
          })
          .join('\t')
      })
      .join('\n')

    const clipboardData = new DataTransfer()
    clipboardData.setData('text/plain', columnHeadersString + '\n' + dataString)
    navigator.clipboard.writeText(clipboardData.getData('text/plain'))
    toast.success('Copied to clipboard')
  }

  return (
    <Dialog
      onHide={onHide}
      style={dialogStyle || { height: '80%', width: '60%' }}
      header={header}
      footer={
        <>
          <Button
            onClick={onCopy}
            icon="content_copy"
            label="Copy to clipboard"
          />
          <Button onClick={() => onHide()} icon="close" label="Cancel" />
        </>
      }
    >
      <div style={{ position: 'relative', flexGrow: 1 }}>
        <Table columns={columns} data={payload.data} className="contained" />
      </div>
    </Dialog>
  )
}

const ContextActionResult = ({ mime, payload, onHide }) => {
  if (mime === 'text/markdown') {
    const components = {
      a: UriComponent,
    }
    return (
      <Dialog onHide={onHide}>
        <MarkdownWrapper>
          <ReactMarkdown components={components}>{payload}</ReactMarkdown>
        </MarkdownWrapper>
      </Dialog>
    )
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
      )
    } // End of table mode
  } // End of application/json
}

export default ContextActionResult
