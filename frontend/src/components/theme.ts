const colors: { [key: string]: string } = {
  surface01: '#19161f',
  surface02: '#1f1e26',
  surface03: '#24202e',
  surface04: '#2e2a38',
  surface05: '#302c3a',
  surface06: '#3a3644',
  surface07: '#413e4e',
  surface08: '#514a5e',
  text: '#d7d4d5',
  textHl: '#fbfbfb',
  textDim: '#ababab',
  textDimmer: '#6a6a6a',
  cyan: '#0ed3fe',
  blue: '#4600ff',
  magenta: '#b000ff',
  violet: '#885bff',
  yellow: '#ec9e00',
  red: '#ff5f5f',
  green: '#5fff5f',
};

const defaultTheme: {
  colors: { [key: string]: string };
  inputHeight: string;
  inputBorder: number;
  inputBorderRadius: string;
  inputPadding: string;
  inputBackground: string;
  fontSize: string;
  gapSize: string;
  sectionGap: string;
  navBorderRadius: string;
} = {
  colors,
  inputHeight: '30px',
  inputBorder: 0,
  inputBorderRadius: '4px',
  inputPadding: '4px',
  inputBackground: colors.surface04,
  fontSize: '0.9rem',
  gapSize: '4px',
  sectionGap: '6px',
  navBorderRadius: '6px',
};

const getTheme = (): typeof defaultTheme => {
  return defaultTheme;
};

export default defaultTheme;
export { getTheme };
