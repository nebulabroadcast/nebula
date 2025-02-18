import { RangeSlider, Icon } from '/src/components';

const ZoomControl = ({ zoom, setZoom }) => {
  const divStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    width: 200,
  };

  const iconStyle = {
    fontSize: '1rem',
  };

  return (
    <div style={divStyle}>
      <Icon icon="zoom_out_map" style={iconStyle} />
      <RangeSlider
        min="1"
        max="4"
        step=".1"
        onChange={(e) => setZoom(e.target.value)}
        value={zoom}
      />
      <Icon icon="zoom_in_map" style={iconStyle} />
    </div>
  );
};

export default ZoomControl;
