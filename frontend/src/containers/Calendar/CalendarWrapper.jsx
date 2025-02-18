import styled from 'styled-components';

const CalendarWrapper = styled.div`
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  font-family: Arial;
  gap: 6px;

  .calendar-header {
    user-select: none;
    user-drag: none;
    display: flex;
    margin-right: ${(props) =>
      props.scrollbarWidth}px; /* Dynamic padding to account for scrollbar */
    margin-left: ${(props) =>
      props.clockWidth}px; /* Dynamic padding to account for scrollbar */

    .calendar-day {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px 0;
      color: #c0c0c0;
    }
  }

  .calendar-body {
    display: flex;
    flex-grow: 1;
    position: relative;

    .calendar-body-wrapper {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow-x: hidden;
      overflow-y: scroll;
    }
  }
`;
export default CalendarWrapper;
