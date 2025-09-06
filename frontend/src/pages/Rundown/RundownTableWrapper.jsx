import styled from 'styled-components';
import { Section } from '/src/components';

const RundownTableWrapper = styled(Section)`
  tbody {
    tr {
      border-left: 0 !important;
    }

    .current-item {
      background-color: var(--color-red-muted) !important;
    }

    .cued-item {
      background-color: var(--color-green-muted) !important;
    }

    .event-row {
      background-color: var(--color-surface-01);
      &:hover {
        background-color: var(--color-surface-01);
      }

      td {
        padding-top: 8px !important;
        padding-bottom: 8px !important;
      }
    }
  }
`;

export default RundownTableWrapper;
