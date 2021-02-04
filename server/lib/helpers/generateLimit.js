function toMinutes(hour){
  return hour * 60;
}
function generateLimit(starts, ends){
  starts = starts.split(':');
  let startHour = parseInt(starts[0]);
  let startMin = parseInt(starts[1]);

  ends = ends.split(':'); 
  let endHour = parseInt(ends[0]);
  let endMin = parseInt(ends[1]);

  let limit = toMinutes(endHour - startHour) + (startMin + endMin);
  console.log(limit);
  return limit;
}

module.exports = generateLimit;