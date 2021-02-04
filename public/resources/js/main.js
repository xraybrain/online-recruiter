$(document).on('focus', '.date-picker', (event) => {
  $('.date-picker').datepicker({});
});
$(document).ready(function () {
  function selectDate(date) {
    $('.calendar-wrapper').updateCalendarOptions({
      date: date,
    });
  }

  var defaultConfig = {
    weekDayLength: 1,
    date: new Date(),
    onClickDate: selectDate,
    showYearDropdown: true,
  };

  var calendar = $('.calendar-wrapper');
  if (calendar.length > 0) {
    calendar.calendar(defaultConfig);
  }

  $(document).on('click', '.nav-tabs a', function (event) {
    $('.nav-tabs a').removeClass('active');
    $(event.currentTarget).addClass('active');
  });

  $(document).on('click', '.write-exam', hasCompletedEducationForm)
  //-- UI elements
  var UI = {
    addItemBtn: $('#add-item-btn'),
    deleteItemBtn: $('#delete-item-btn'),
    listBox: $('#list-box'),
    datePicker: $('.date-picker'),
    containerPane: $('#container-pane'),
    viewPersonalBtn: $('#view-personnal-btn'),
    viewContactBtn: $('#view-contact-btn'),
    viewEducationBtn: $('#view-education-btn'),
    nextQuestionBtn: $('#next-question-btn'),
    prevQuestionBtn: $('#prev-question-btn'),
    subjectID: $('#sid').val(),
    qn: $('#qn'),
    totalQuestion: $('#total-question').val(),
    questionPane: $('#question-pane'),
    questionTemplate: $('#question-template'),
    writeExam: $('.write-exam'),
    questionOption: $('.option'),
    submitExam: $('#submit-exam'),
    previewApplication: $('#preview-application'),
    printable: $('#printable'),
    btnPrint: $('#btn-print'),
    clock: $('#clock'),
  };

  //-- event handlers
  function addItem(e) {
    e.preventDefault();
    //-- get the clicked btn
    var element = $(e.currentTarget);
    //-- get the target element to add this item
    var targetBox = $(element.attr('data-target'));
    //-- get the template to add to this box
    var template = $(element.attr('data-template')).html();
    //-- pass this template to mustache
    var html = Mustache.to_html(template);

    //-- append the template to the box
    targetBox.append(html);
  }

  function deleteItem(e) {
    e.preventDefault();
    //-- get the clicked btn
    var element = $(e.currentTarget);
    //-- get the target element to remove the last item
    var targetBox = element.attr('data-target');
    $(
      targetBox + ' .row:last-child,' + targetBox + ' .input-group:last-child'
    ).remove();
  }

  function uploadPassport(e) {
    console.log('am called');
    $('#passportUploader').ajaxSubmit({
      url: '/applicant/upload/passport/',
      success: updatePassport,
    });
  }

  function updatePassport(data) {
    console.log(data);
    if (data.err !== null) {
      return alert(data.msg);
    }

    $('#passport').attr('src', data.fileName);
    $('#picDir').attr('value', data.fileName);
  }

  function verifiedFormStatus(data) {
    if (data.err !== null) {
      return alert(data.msg);
    }

    let nextForm = data.nextForm;
    let status = data.status;

    if (status) {
      switch (nextForm) {
        case 'contactForm':
          viewContactDetails();
          break;
        case 'educationForm':
          viewEducationDetails();
          break;
        case 'writeExam':
          window.location = '/applicant/start/exam/';
          break;
        case 'previewApplication':
          window.location = '/applicant/preview/application/';
          break;
      }
    } else {
      alert('Sorry you have to complete the other form before this one.');
    }
  }

  function viewPersonnalDetails(e) {
    e.preventDefault();

    // load the personnal details template
    var template = $('#personnal-form').html();
    UI.containerPane.html(template);

    //-- register submit event
    $('#personal-details-form').on('submit', submitForm);
    $('#fileUpload').on('change', uploadPassport);
  }

  function hasCompletedPersonalForm(e) {
    $.get(
      '/applicant/has/completed/form/?form=personalForm',
      verifiedFormStatus
    );
  }

  function hasCompletedContactForm(e) {
    $.get(
      '/applicant/has/completed/form/?form=contactForm',
      verifiedFormStatus
    );
  }

  function hasCompletedEducationForm(e) {
    $.get(
      '/applicant/has/completed/form/?form=educationForm',
      verifiedFormStatus
    );
  }

  function hasCompletedExam(e) {
    $.get('/applicant/exam/completed/', verifiedFormStatus);
  }

  function viewContactDetails() {
    //e.preventDefault();

    //load the contact details template
    var template = $('#contact-details').html();
    UI.containerPane.html(template);
    $('#contact-details-form').on('submit', submitForm);
  }

  function viewEducationDetails() {
    // e.preventDefault();

    var template = $('#education-details').html();
    UI.containerPane.html(template);
    $('#education-details-form').on('submit', submitForm);
    //UI.writeExam = $(".write-exam");
    //UI.writeExam.on("click", hasCompletedContactForm);
  }

  function submitForm(e) {
    e.preventDefault();
    var action = e.currentTarget.action;

    $(this).ajaxSubmit({ url: action, success: loadNextForm });
  }

  function loadNextForm(data) {
    if (data.err !== null) return alert(data.msg);

    var nextForm = data.nextForm;

    switch (nextForm) {
      case 'contactForm':
        viewContactDetails();
        break;
      case 'educationForm':
        viewEducationDetails();
        break;
      case 'isEducation':
        updateEducationTable(data.education);
        break;
    }
  }

  function updateEducationTable(data) {
    console.log(data);
    var template = $('#applicant-education').html();
    var html = Mustache.to_html(template, data);
    $('#education-pane').append(html);
  }

  /**************************************
   *
   * The following functions manage the exam
   */
  function nextQuestion(e) {
    var totalQn = parseInt(UI.totalQuestion);
    var sid = parseInt(UI.subjectID);
    var qn = parseInt(UI.qn.val());

    //console.log(totalQn, sid, qn);

    //-- check if question number is less than totalQn
    if (qn < totalQn - 1) {
      qn++;
    } else {
      qn = 0;
    }
    //-- update the UI.qn
    UI.qn.val(qn);
    //-- send ajax request to server
    let req = '/applicant/exam/?sid=' + sid + '&qn=' + qn;
    window.history.replaceState({ exam: 'question' }, 'exam', req);
    $.get(req + '&request=ajax', updateQuestion);
  }

  function prevQuestion(e) {
    var totalQn = parseInt(UI.totalQuestion);
    var sid = parseInt(UI.subjectID);
    var qn = parseInt(UI.qn.val());

    //-- check if question number is greater than or equal to 0
    if (qn > 0) {
      qn--;
    } else {
      qn = totalQn - 1;
    }
    //-- update the UI.qn
    UI.qn.val(qn);
    //-- send ajax request to server
    let req = '/applicant/exam/?sid=' + sid + '&qn=' + qn;
    window.history.replaceState({ exam: 'question' }, 'exam', req);
    $.get(req + '&request=ajax', updateQuestion);
  }

  function updateQuestion(question) {
    var qn = parseInt(UI.qn.val()) + 1;
    var data = {
      question: question.question,
      qn: qn,
    };

    //-- template helper
    data.checked = function () {
      let attr = '';

      return function (option) {
        if (data.question.selectedOption === option) {
          attr = 'checked="checked"';
        }

        return attr;
      };
    };

    var template = UI.questionTemplate.html();
    var html = Mustache.to_html(template, data);
    UI.questionPane.html(html);
    UI.questionOption = $('.option');
    UI.questionOption.on('change', submitAnswer);
  }

  function submitAnswer(e) {
    let element = $(e.currentTarget);
    let qid = element.attr('data-qid');
    let sid = UI.subjectID;
    let selectedOption = element.val();
    let qNo = UI.qn.val();

    console.log(qid, sid, selectedOption);
    //-- send ajaxRequest to server
    $.post(
      '/applicant/submit/answer/',
      { qid, sid, selectedOption, qNo },
      answerSubmitRes
    );
  }

  function answerSubmitRes(data) {
    console.log(data);
  }

  function submitExam(e) {
    e.preventDefault();

    var choice = confirm('Are you sure you want to submit this exam?');

    if (choice === true)
      window.location = '/applicant/submit/exam/?sid=' + UI.subjectID;
  }

  function print() {
    var ele = UI.printable;

    var printerStyle = `
    <style type="text/css">
    @media print{
      .receipt {width: 30%;margin: 12px auto;font-size: 25px;}
      .receipt * {margin: 0px;padding: 0px;font-size: 85%;}
      .receipt-header{text-align: center;margin-bottom: 50px;}
      .receipt-title{font-family: "Arial Black", "Century Gothic", sans-serif;     margin-bottom: 1px;}
      .receipt-details{list-style: none;font-family: "Times New Roman", "Agency", serif;}
      .receipt-details li {line-height: 2;}
      table{width: 100%;border-collapse: collapse;}
      .container tr:nth-child(even){background-color: #898;}
      table th, table td {text-align: left;padding: 2px;    font-size: 87%;}
      table, td, th{border: 1px solid #000;}
      .passport {width: 200px;height: 150px;}
    }
    </style>
    `;
    var href = window.location.href;

    var winPrint = window.open(
      href,
      '',
      'left=0, top=0, width=384, height=900, toolbar=0, scrollbars=0,status=0'
    );
    winPrint.document.write('<html><head>');
    winPrint.document.write(printerStyle);
    winPrint.document.write('</head><body>');
    winPrint.document.write(ele.html());
    winPrint.document.write('</body></html>');
    winPrint.focus();
    winPrint.print();
    winPrint.document.close();
  }

  //-- init function
  function init() {
    //-- register event handlers here
    UI.addItemBtn.on('click', addItem);
    UI.deleteItemBtn.on('click', deleteItem);
    UI.datePicker.datepicker({});
    UI.viewPersonalBtn.on('click', viewPersonnalDetails);
    UI.viewContactBtn.on('click', hasCompletedPersonalForm);
    UI.viewEducationBtn.on('click', hasCompletedContactForm);
    UI.writeExam.on('click', hasCompletedEducationForm);
    UI.previewApplication.on('click', hasCompletedExam);
    UI.nextQuestionBtn.on('click', nextQuestion);
    UI.prevQuestionBtn.on('click', prevQuestion);
    UI.questionOption.on('change', submitAnswer);
    UI.submitExam.on('click', submitExam);

    UI.btnPrint.on('click', print);
    if (UI.containerPane.length > 0) viewPersonnalDetails(new Event('load'));

    //-- call this function every 1sec
    if (UI.clock.length > 0) {
      setInterval(function () {
        digitalClock();
      }, 1000);
    }
  }

  function digitalClock() {
    var localTime = new Date().toLocaleTimeString('en-US', {
      timeZone: 'Africa/Lagos',
    });
    UI.clock.html(localTime);
  }

  //-- initialize app
  init();
});
