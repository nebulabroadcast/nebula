import styled from 'styled-components';

interface AvailabilityProps {
  available: boolean;
}
export const Availability = styled.span<AvailabilityProps>`
  display: inline-flex;
  align-items: center;
  font-size: 0.9rem;
  margin-top: 0.3rem;
  width: 100px;

  &::before {
    content: '';
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${(p) => (p.available ? '#5fff5f' : '#ff2404')};
    margin-right: 0.5rem;
  }
`;

export const StorageName = styled.h3`
  margin: 0;
  font-size: 1.5rem;
`;

export const StorageHeader = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
`;

export const Sizes = styled.div`
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #aaa;
`;
