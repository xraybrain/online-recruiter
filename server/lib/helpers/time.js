function toTime(timeInt){
  let hour=0;
  let minute=0;
  while(timeInt > 0){
    if(timeInt >= 60){
      hour += 1;
      timeInt -= 60;
    }else{
      minute = timeInt;
      timeInt = 0;
    }
  }

  return `${hour}:${minute}`;
}

function toMinute(time=''){
  //-- To Array
  time = time.split(':');
  let hour, minute;
  hour = parseInt(time[0]);
  minute = parseInt(time[1]);

  while(hour > 0){
    minute += 60;
    hour -= 1;
  }

  return minute;
}

module.exports = {toTime, toMinute};