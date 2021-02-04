ExamModules = (function () {
  /**
	 * pad zero (0) as the begin of digits below 10 to 0
	 */
	function padZero(value){
		padded = value;
		if (value < 10 && value >= 0){
			padded = 0 + "" + value;
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
      seconds: padZero(seconds)
    };
  }

  function next(qNo, totalQ){
    // increment the var by 1
    qNo = parseInt(qNo);
    totalQ = parseInt(totalQ);

    if(qNo < totalQ-1)
    {
      qNo += 1;
    } else {
      qNo = 0;
    }
    return qNo;
  }

  function prev(qNo, totalQ){
    // decrement the var by 1
    if(qNo > 0)
    {
      qNo -= 1;
    } else {
      qNo = totalQ - 1;
    }
    return qNo;
  }

  return {
    timer: timer,
    next: next,
    prev: prev
  };
})();

var ExamUI = (function () {
  var timeHour = $('#hour');
  var timeMinute = $('#minute');
  var timeSecond = $('#seconds');
  var submitExamBtn = $('#submit-exam');
  var prevBtn = $('#prev-btn');
  var nextBtn = $('#next-btn');
  var questionsNo = $('.questions-no');
  var totalQuestion = $('#tq');
  var subjectId = $('#sid');
  var qNo = $('#qno');
  var question = $('#question');
  var optionPanel = $('.option-panel');
  var optionsTemplate = $('#optionsTmpl');



  return {
    time: {
      hour: timeHour,
      minute: timeMinute,
      seconds: timeSecond
    },
    submitExamBtn: submitExamBtn,
    prevBtn: prevBtn,
    nextBtn: nextBtn,
    questionsNo: questionsNo,
    totalQuestion: totalQuestion,
    subjectId: subjectId,
    qNo: qNo,
    question: question,
    optionPanel: optionPanel,
    optionsTemplate: optionsTemplate
  };
})();

var ExamController = (function (ExamUI, ExamModules) {

  function init() {
    // var hour, minute, seconds;
    // hour = 0;
    // minute = 40;
    // seconds = 0;
    // ExamUI.time.hour.text(hour);
    // ExamUI.time.minute.text(minute);
    // ExamUI.time.seconds.text(seconds);

    // timer
    setInterval(function () {
      var currentHour, currentMinute, currentSeconds;
      currentHour = ExamUI.time.hour.text();
      currentMinute = ExamUI.time.minute.text();
      currentSeconds = ExamUI.time.seconds.text();
      
      var timeObj = ExamModules.timer(currentHour, currentMinute, currentSeconds);

      ExamUI.time.hour.text(timeObj.hour);
      ExamUI.time.minute.text(timeObj.minute);
      ExamUI.time.seconds.text(timeObj.seconds);

      if(timeObj.hour === 0 && timeObj.minute === 0 && timeObj.seconds === 0){
        var sid = ExamUI.subjectId.val();
        window.location.href = "/candidate/submit/exam/"+sid;
      }

      $.ajax(
        {
          url: '/candidate/update/time/'+timeObj.hour+'/'+timeObj.minute+'/'+timeObj.seconds,
          method: 'get',
          success:console.debug,
          error: error
        }
      )
    }, 1000);
  }

  function loadQuestion(restData){
    console.log(restData);
    ExamUI.question.html(restData.restData.question);

    var html = Mustache.to_html(ExamUI.optionsTemplate.html(), restData);
    ExamUI.optionPanel.html(html);
    history.replaceState({exam: 'question'}, 'Exam', '/candidate/exam/'+restData.restData.sid+'/'+restData.restData.qno)
  }

  function error(err){
    console.log(err);
  }

  function getQuestion(sid, qNo, selOpt, pQno){
    $(this).ajaxSubmit({
      url: '/candidate/question/'+sid+'/'+qNo+'/'+selOpt+'/'+pQno,
      method: 'get',
      success: loadQuestion,
      error: error
    });
  }

  function nextEvent(e){
    e.preventDefault();

    var qNo = ExamUI.qNo.val();
    var totalQ = ExamUI.totalQuestion.val();
    var sid = ExamUI.subjectId.val();
    var selOption = this.form['option'].value;
    var pQno = qNo;

    if(!selOption){
      selOption = null;
    }

    qNo = ExamModules.next(qNo, totalQ);
    ExamUI.qNo.val(qNo);

    getQuestion(sid, qNo, selOption, pQno);
  }

  function prevEvent(e){
    e.preventDefault();

    var qNo = ExamUI.qNo.val();
    var totalQ = ExamUI.totalQuestion.val();
    var sid = ExamUI.subjectId.val();
    var pQno = qNo;

    var selOption = this.form['option'].value;

    if(!selOption){
      selOption = null;
    }

    qNo = ExamModules.prev(qNo, totalQ);
    ExamUI.qNo.val(qNo);

    getQuestion(sid, qNo, selOption, pQno);
  }

  function submitExam(e){
    e.preventDefault();
    var canSubmit = confirm("Are you sure you want to submit this Test?");
    
    if(canSubmit){
      var sid = ExamUI.subjectId.val();

      window.location.href = "/candidate/submit/exam/"+sid;
    }
  }

  //-- register event
  ExamUI.nextBtn.on('click', nextEvent);
  ExamUI.prevBtn.on('click', prevEvent);
  ExamUI.submitExamBtn.on('click', submitExam);
  return {
    init:init
  };
})(ExamUI, ExamModules);

$(document).ready(function(){
  ExamController.init();
});

let sid = "{{restData.question.sid}}"