import { RangeSlider, Icon } from '@components';
import React from 'react';

interface ZoomControlProps {
  zoom: number;
  setZoom: (zoom: number) => void;
}

const ZoomControl: React.FC<ZoomControlProps> = ({ zoom, setZoom }) => {
  const divStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    width: 200,
  };

  const iconStyle: React.CSSProperties = {
    fontSize: '12px',
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(parseFloat(e.target.value));
  };

  return (
    <div style={divStyle}>
      <Icon icon="zoom_out_map" style={iconStyle} />
      <RangeSlider min="1" max="8" step=".1" onChange={onChange} value={zoom} />
      <Icon icon="zoom_in_map" style={iconStyle} />
    </div>
  );
};

export default ZoomControl;
