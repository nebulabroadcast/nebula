const RUN_MODES = ['Auto', 'Manual', 'Soft', 'Hard', 'Skip'];

const formatRundownRunMode = (rowData, key) => {
  const runMode = RUN_MODES[rowData[key] || 0];
  return <td className={'run-mode'}>{runMode}</td>;
};

export default formatRundownRunMode;
