import clsx from 'clsx';

const QC_STATES = ['new', 'auto_rejected', 'auto_accepted', 'rejected', 'accepted'];

const formatObjectQcState = (rowData: Record<string, any>, key: string) => {
  const qcState = QC_STATES[rowData[key] as number];
  return (
    <span className={clsx('qc-state', qcState)}>
      <div />
    </span>
  );
};

export default formatObjectQcState;
