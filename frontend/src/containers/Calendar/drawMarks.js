const drawMarks = (ctx, drawParams) => {
  const { dayWidth, hourHeight, startTime, time2pos } = drawParams.current;

  const startHour = startTime?.getHours() || 0;
  const startMinute = startTime?.getMinutes() || 0;

  const firstTime = new Date(startTime);
  firstTime.setMinutes(startMinute + ((15 - (startMinute % 15)) % 15));
  firstTime.setHours(startHour + (startMinute + ((15 - (startMinute % 15)) % 15)) / 60);

  for (let rday = 0; rday < 7; rday++) {
    for (let rtime = 0; rtime < 24 * 4; rtime++) {
      const timeMarker = new Date(firstTime.getTime() + rtime * 15 * 60000);
      const minutes = timeMarker.getMinutes();
      const { x, y } = time2pos(timeMarker);

      if (hourHeight < 50 && minutes !== 0) {
        continue;
      }

      const x1 = x + rday * dayWidth + 10;
      const x2 = x1 + dayWidth - 10;

      ctx.beginPath();
      ctx.strokeStyle = '#444';
      if (minutes === 0) {
        ctx.setLineDash([1, 0]);
      } else {
        ctx.setLineDash([5, 5]);
      }
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
      ctx.setLineDash([]); // Reset to solid lines for other drawings
      if (rday === 0 && minutes === 0) {
        ctx.font = '12px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText(timeMarker.toTimeString().slice(0, 5), 10, y + 4);
      }
    }
  }
};

export default drawMarks;
