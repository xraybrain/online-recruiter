$(document).ready(function () {
  var UI = {
    hour: $('#hour'),
    minute: $('#minute'),
    seconds: $('#seconds'),
  };

  var timerInterval;

  function padZero(value) {
    padded = value;
    if (value < 10 && value >= 0) {
      padded = 0 + '' + value;
    }
    return padded;
  }

  function timer(hour, minute, seconds) {
    hour = parseInt(hour);
    minute = parseInt(minute);
    seconds = parseInt(seconds);

    if (hour > 0 && minute === 0) {
      hour -= 1;
      minute = 60;
    }

    if (minute > 0 && seconds === 0) {
      minute -= 1;
      seconds = 60;
    }

    if (seconds > 0) {
      seconds -= 1;
    }

    return {
      hour: padZero(hour),
      minute: padZero(minute),
      seconds: padZero(seconds),
    };
  }

  function currentTime() {
    var hour = UI.hour.text();
    var minute = UI.minute.text();
    var seconds = UI.seconds.text();

    var current = timer(hour, minute, seconds);
    //-- update timer UI
    UI.hour.text(current.hour);
    UI.minute.text(current.minute);
    UI.seconds.text(current.seconds);
    if (current.hour == 0 && current.minute == 0 && current.seconds == 0) {
      clearInterval(timerInterval);
      window.location = '/applicant/submit/exam/?sid=' + $('#sid').val();
    }
  }

  //-- ajax Request
  function getExamTime() {
    $.get('/applicant/exam/time/', updateTimerUI);
  }

  function setExamTime() {
    let time = {
      hour: UI.hour.text(),
      minute: UI.minute.text(),
      second: UI.seconds.text(),
    };
    // console.log(time);
    $.post('/applicant/update/exam/time/', time, timeSet);
  }

  function timeSet(data) {
    console.log(data);
  }

  function updateTimerUI(examTime) {
    console.log(examTime);
    UI.hour.text(examTime.hour);
    UI.minute.text(examTime.minutes);
    UI.seconds.text(examTime.seconds);

    //-- set the interval
    timerInterval = setInterval(function () {
      currentTime();
      setExamTime();
    }, 1000);
  }

  //-- setup time
  getExamTime();
});
