import styled from 'styled-components';

// The filter popover and its parts (FilterPopover, ViewList, ColumnList,
// OptionList)
export const Pop = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  /* below the header, within the window */
  max-height: min(520px, calc(100vh - 160px));
  background-color: var(--color-surface-03);
  border: 1px solid var(--color-surface-06);
  border-radius: 6px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
  overflow: hidden;

  .cols {
    display: grid;
    grid-template-columns: 168px 1fr;
    grid-template-rows: minmax(0, 1fr);
    min-height: 0;
    flex: 1;

    > div {
      min-height: 0;
      overflow: auto;
      padding-bottom: 6px;
    }
  }

  .views {
    border-right: 1px solid var(--color-surface-05);
  }

  .hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px 4px;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-text-dim);

    button {
      border: 0;
      background: none;
      padding: 0;
      cursor: pointer;
      color: var(--color-text-dim);
      font-size: 10.5px;
      text-transform: none;
      letter-spacing: 0;

      &:hover {
        color: var(--color-text-hl);
      }
    }
  }

  .it {
    display: flex;
    align-items: center;
    gap: 6px;
    box-sizing: border-box; /* rows that are divs, not buttons */
    width: 100%;
    height: 26px;
    padding: 0 10px;
    border: 0;
    background: none;
    color: var(--color-text);
    text-align: left;
    white-space: nowrap;
    cursor: pointer;

    .icon {
      font-size: 17px;
      color: var(--color-text-dim);
    }

    .grow {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dim {
      color: var(--color-text-dim);
    }

    .actions {
      display: none;
      gap: 2px;
    }

    &:hover .actions {
      display: flex;
    }

    &:hover,
    &.hi {
      background-color: var(--color-surface-05);
      color: var(--color-text-hl);
    }

    &.hi {
      box-shadow: inset 2px 0 0 var(--color-cyan);
    }

    &.current,
    &.current .icon {
      color: var(--color-cyan);
    }

    /* unsaved changes */
    &.changed,
    &.changed .icon {
      color: var(--color-violet);
    }

    /* fits the views column: .nb-input is at least 200 px wide and 30 high */
    input {
      flex: 1;
      min-width: 0;
      min-height: 0;
      height: 22px;
    }
  }

  .remove {
    font-size: 15px;
    opacity: 0.5;

    &:hover {
      opacity: 1;
    }
  }

  .fields {
    max-height: 160px;
    overflow: auto;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px 10px 10px;

    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
    }

    .row.end {
      justify-content: flex-end;

      .it {
        width: auto;
      }
    }
  }

  .options {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-height: 120px;
    overflow: auto;
  }

  .options button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 22px;
    padding: 0 8px;
    border: 0;
    border-radius: 3px;
    background-color: var(--color-surface-04);
    color: var(--color-text-dim);
    cursor: pointer;

    &:hover:not(:disabled) {
      color: var(--color-text-hl);
    }

    /* a label, not a value */
    &:disabled {
      background: none;
      color: var(--color-text);
      cursor: default;
    }

    &.on {
      background-color: var(--color-surface-06);
      color: var(--color-text-hl);
    }

    .icon {
      font-size: 14px;
    }
  }

  .options button.on {
    background-color: var(--active-item-background);
    color: var(--active-item-color);
  }

  .operators {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 2px;
    padding: 2px;
    border-radius: 4px;
    background-color: var(--color-surface-04);

    button {
      height: 22px;
      padding: 0 8px;
      border: 0;
      border-radius: 3px;
      background: none;
      color: var(--color-text-dim);
      cursor: pointer;

      &.on {
        background-color: var(--color-surface-07);
        color: var(--color-cyan);
      }
    }
  }

  .divider {
    border-top: 1px solid var(--color-surface-05);
  }

  @media (max-width: 520px) {
    .cols {
      grid-template-columns: 1fr;
    }

    .views {
      max-height: 120px;
      border-right: 0;
      border-bottom: 1px solid var(--color-surface-05);
    }
  }

  /* Filters / Columns */
  .modes {
    display: flex;
    gap: 2px;
    padding: 6px 6px 0;
    border-bottom: 1px solid var(--color-surface-05);

    button {
      height: 26px;
      padding: 0 10px;
      border: 0;
      border-bottom: 2px solid transparent;
      background: none;
      color: var(--color-text-dim);
      cursor: pointer;

      &:hover {
        color: var(--color-text-hl);
      }

      &.on {
        color: var(--color-text-hl);
        border-bottom-color: var(--color-cyan);
      }
    }
  }

  /* Column order, dragged by the handle */
  .column-row {
    cursor: grab;

    &.dragging {
      opacity: 0.4;
    }

    &.drop-before {
      box-shadow: inset 0 2px 0 var(--color-cyan);
    }

    &.drop-after {
      box-shadow: inset 0 -2px 0 var(--color-cyan);
    }
  }

  .option-search {
    width: 100%;
    height: 24px;
  }

  .option-tree {
    max-height: 200px;
    overflow: auto;

    .option {
      display: flex;
      align-items: center;
      height: 24px;

      .chevron {
        width: 18px;
        font-size: 16px;
        color: var(--color-text-dim);
        cursor: pointer;

        &.leaf {
          visibility: hidden;
        }
      }

      button {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 4px;
        height: 22px;
        padding: 0 4px;
        border: 0;
        border-radius: 3px;
        background: none;
        color: var(--color-text);
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;

        .icon {
          font-size: 16px;
          color: var(--color-text-dim);
        }

        &:hover:not(:disabled) {
          background-color: var(--color-surface-05);
        }

        &.label:hover {
          background: none;
        }
      }

      &.on button,
      &.on button .icon {
        color: var(--color-cyan);
      }

      &.included button {
        cursor: default;
        color: var(--color-text-dim);
      }
    }
  }
`;
