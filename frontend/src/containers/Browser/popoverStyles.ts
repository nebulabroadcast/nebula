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
      box-shadow: inset 2px 0 0 var(--color-violet);
    }

    &.current,
    &.current .icon {
      color: var(--color-cyan);
    }

    &.armed {
      box-shadow: inset 2px 0 0 var(--color-red);
      background-color: color-mix(in srgb, var(--color-red) 10%, transparent);
    }

    input {
      flex: 1;
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
    }
  }

  .options {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-height: 120px;
    overflow: auto;
  }

  .options button,
  .chips button {
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

    &:hover {
      color: var(--color-text-hl);
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
    background-color: var(--color-violet);
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

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 2px 10px 6px;
  }

  .divider {
    border-top: 1px solid var(--color-surface-05);
  }

  .foot {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 4px 10px;
    border-top: 1px solid var(--color-surface-05);
    font-size: 10.5px;
    color: var(--color-text-dim);
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
      display: inline-flex;
      align-items: center;
      gap: 4px;
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
        border-bottom-color: var(--color-violet);
      }

      .count {
        padding: 0 4px;
        border-radius: 6px;
        background-color: var(--color-surface-06);
        font-size: 10px;
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
