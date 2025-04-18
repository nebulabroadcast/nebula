import styled from 'styled-components';

const LogoSVG = styled.svg`
  margin-right: 1rem;
  path {
    fill: var(--color-text);
    stroke: var(--color-text-dim);
    stroke-width: 0.5;
  }
`;

const Logo = () => (
  <LogoSVG width="28" height="28" viewBox="0 0 93 93" version="1.1">
    <g id="layer2" transform="translate(0,-30.95625)">
      <g id="g325" transform="matrix(1.6803343,0,0,1.6803343,-44.612547,-16.493951)">
        <g id="g75" transform="matrix(0.97722424,0,0,0.98554268,0.60352361,0.16142272)">
          <path
            id="path73"
            d="M 82.946,84.408 H 26.551 V 28.489 h 56.395 z m -55.395,-1 H 81.946 V 29.489 H 27.551 Z"
          />
        </g>
        <path id="path87" d="M 37.323,67.469" strokeMiterlimit="10" />
        <path d="m 71.335054,58.98133 c -1.406,-2.625 -4.25,-3.594 -4.594,-3.719 0,0 3.031,-1 3.719,-4.531 0,0 0.813,-3.063 -1.375,-5.656 0,0 -1.375,-2.25 -6.219,-2.688 0,0 -1.438,-0.156 -2.313,-0.188 -0.875,-0.032 -5.063,-0.031 -5.063,-0.031 v 17.895 l -13.14,-17.863 h -2.406 l 15.547,21.072 v 2.459 l -17.5,-23.547 h -1.813 v 27.094 h 2.063 v -23.437 l 17.516,23.578 h 1.813 v -25.25 c 0,0 4.203,-0.313 7.797,0.859 0,0 3.156,0.844 3.031,4.375 0,0 0.344,3.406 -3.688,4.5 0,0 -2.438,0.625 -4.438,0.531 v 1.969 c 0,0 3.625,-0.016 4.813,0.344 0,0 2.969,0.563 4.281,2.938 0,0 1.438,2.406 -0.5,5.125 0,0 -1.188,1.656 -3.781,2.219 0,0 -0.906,0.438 -4.781,0.375 v 1.969 c 0,0 3.5,0.188 5.688,-0.531 2.219,-0.672 4.594,-1.813 5.594,-4.594 -0.001,-10e-4 1.155,-2.642 -0.251,-5.267 z" />
      </g>
    </g>
  </LogoSVG>
);

export default Logo;
