import styled from 'styled-components';

const TableWrapper = styled.div`
  --progress: 0% --progress-opacity: 0;
  overflow: auto;

  [data-key='${(props) => props.$drophl || 'default'}'] {
    td {
      border-bottom: 1px solid var(--color-violet) !important;
    }
  }

  table {
    width: 100%;
    border-collapse: collapse;

    &:focus,
    &:focus-visible {
      outline: none;
    }

    tr {
      border-left: 2px solid var(--color-surface-02);
      outline: none !important;
    }

    td,
    th {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    td {
      padding: 4px 8px;
      max-width: 300px;
      color: var(--color-text);
      user-select: none;
    }

    th div {
      padding: 0 8px;
      font-weight: bold;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
      user-drag: none;
      .icon {
        font-size: 22px;
      }
    }

    td div {
      display: flex;
      flex-direction: row;
      align-items: center;
    }

    thead {
      tr {
        background-color: var(--color-surface-03);
        z-index: 999;
      }

      th {
        text-align: left;
        background-color: var(--color-surface-03);
        position: sticky;
        top: 0;
        height: var(--input-height);
        outline: 2px solid var(--color-surface-02);
      }

      :first-child {
        border-top-left-radius: 4px;
      }

      :last-child {
        border-top-right-radius: 4px;
        border-right: 0;
      }

      tr:before {
        position: absolute;
        display: block;
        z-index: 0;
        width: 0;
        opacity: 0;
        content: '';
      }
    }

    tbody {
      &:focus,
      &:focus-visible {
        outline: none;
      }

      tr {
        border-bottom: 1px solid var(--color-surface-03);
      }

      td {
        hr {
          margin: 0;
          border: 0;
          border-top: 1px solid var(--color-surface-05);
        }

        &.action {
          padding: 0;
          button {
            min-height: 24px;
            max-height: 24px;
            padding: 2px;
            width: 100%;
            background: transparent;
            border: 1px solid var(--color-violet);
          }
        }

        &.dim {
          font-size: 0.7em;
          color: var(--color-text-dim);
        }
      }

      tr {
        cursor: pointer;
        background-color: transparent;
        &:hover {
          background-color: var(--color-surface-03);
        }

        &.selected {
          background-color: var(--color-surface-05);
          color: var(--color-text-hl);

          &:hover {
            background-color: var(--color-surface-06);
          }
        }

        &:before {
          position: absolute;
          display: block;
          z-index: 0;
          width: var(--progress);
          opacity: var(--progress-opacity);
          content: '';
          height: 28px;
          background-color: var(--color-violet);
          transition: width 1s linear;
        }
      }
    }
  }
`;

export default TableWrapper;
