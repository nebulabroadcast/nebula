import nebula from '/src/nebula';

const formatAuthorship = (rowData, key) => {
  return <td>{nebula.getUserName(rowData[key])}</td>;
};

export default formatAuthorship;
