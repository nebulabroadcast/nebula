import { useParams } from 'react-router';

const IFRAME_STYLE: React.CSSProperties = {
  flexGrow: 1,
  background: 'transparent',
  padding: 0,
  border: 'none',
};

const ToolPage = () => {
  const { tool } = useParams();
  const toolURL = `${window.location.origin}/plugins/${tool}/index.html`;
  return <iframe src={toolURL} style={IFRAME_STYLE} />;
};

export default ToolPage;
