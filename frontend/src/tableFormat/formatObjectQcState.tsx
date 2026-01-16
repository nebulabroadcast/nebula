import type { JSX } from 'react/jsx-runtime';
import clsx from 'clsx';

const QC_STATES = ['new', 'auto_rejected', 'auto_accepted', 'rejected', 'accepted'];

const formatObjectQcState = (
  rowData: Record<string, any>,
  key: string
): JSX.Element => {
  const qcState = QC_STATES[rowData[key]];
  return (
    <td className={clsx('qc-state', qcState)}>
      <div />
    </td>
  );
};

export default formatObjectQcState;
