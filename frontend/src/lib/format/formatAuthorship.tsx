import nebula from '@/nebula';

const formatAuthorship = (rowData: Record<string, any>, key: string) =>
  nebula.getUserName(rowData[key] as number);

export default formatAuthorship;
