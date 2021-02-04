$(document).ready(function(){
  var dashboardPanel = $('#dashboard-panel');
  var addCandidate = $('#add-candidate');
  var addCandidate2 = $('#add-candidate-2');
  var addQuestion = $('#add-question');
  var addQuestion2 = $('#add-question-2');
  var addExam = $('#add-exam');
  var addExam2 = $('#add-exam-2');
  var addSubject = $('#add-subject');
  var addSubject2 = $('#add-subject-2');
  var addExamSchedule = $('#add-exam-schedule');
  var addExamSchedule2 = $('#add-exam-schedule-2');
  var subjectsSelect = $('#subjects-select');

  var viewCandidates = $('#view-candidates');
  var viewQuestions = $('#view-questions');
  var viewExam = $('#view-exams');
  var viewSubjects = $('#view-subjects');

  //-- called once the user clicks on the save button
  function saved(msg){
    removeLoadingGif();
    AppController.showOkDialog(msg);
    if(msg.err === null){
      //--executes after 10 sec
      setTimeout(function(){
        window.location.href = "/admin/"; //reload the dashboard
      }, 3000);
    }
  }

  /**
   * 
   * @param {*} data 
   * This handy function is used to preview ajax results from the server
   */
  function preview(data){
    var template  = $(data.prevTemp).html(); //-- gets the preview template
    var html = Mustache.to_html(template, data);
    dashboardPanel.html(html);

    var cancelPreview = $('#cancel-preview');  //-- this is in preview template
    var savePreview = $('#save-preview'); //-- this is in preview template

    cancelPreview.on('click', function(){
      $(data.cancel).click();
    });

    //-- handle the save button on preview form
    savePreview.on('submit', function(e){
      e.preventDefault();
      $(this).ajaxSubmit({
        url: data.saveTo, 
        method: 'post', 
        beforeSend: loadingGif,
        success:saved, 
        error: error
      });
    });
  }
  function error(msg){
    var text = msg.responseJSON.errMsg;
    Modules.getEventHandlers().showOkDialog({msgHeader:'Error Occured', msg:text}, UI);
  }

  function loadingGif(){
    var template = $('#load-tmpl').html();
    var html = Mustache.to_html(template);
    dashboardPanel.append(html);
  }

  function removeLoadingGif(){
    $('#load-gif').remove();  
  }
  function showUploadCandidatesTemplate(){
    var template = $('#add-candidate-tmpl').html();
    var html = Mustache.to_html(template);
    dashboardPanel.html(html);

    var candidatesUploadForm = $('#uploadCandidates');
    //-- Event Listener that Executes when user clicks upload btn for candidates upload
    candidatesUploadForm.on('submit', function(e){
      e.preventDefault();
      $(this).ajaxSubmit({ url: '/admin/upload/candidates',
                           method: 'post', 
                           success:preview, 
                           error: error,
                           beforeSend: loadingGif
                          });
    });

    var candidatesRegisterForm = $('#register-candidate');
    candidatesRegisterForm.on('submit',function(e){
      e.preventDefault();
      $(this).ajaxSubmit({ url: '/admin/register/candidate',
                           method: 'post', 
                           success:saved, 
                           error: error,
                           beforeSend: loadingGif
                          });
    });
  }
  addCandidate.on('click', showUploadCandidatesTemplate);
  addCandidate2.on('click', showUploadCandidatesTemplate);

  function showUploadQuestionsTemplate(event){
    var template = $('#add-question-tmpl').html();
    var html = Mustache.to_html(template);
    dashboardPanel.html(html);

    //-- Load the subjects from the server
    $.get('/admin/get/subjects',function(data, status){
      var subjects = $('#q-subjects');
      var template = '{{#subjects}}'+
                       '<option value="{{id}}">{{name}}</option>'+
                     '{{/subjects}}';
      var html = Mustache.to_html(template, data);
      subjects.append(html);
    });

    var questionsUploadForm = $('#uploadQuestions');
    //-- Event Listener that Executes when user clicks upload btn for candidates upload
    questionsUploadForm.on('submit', function(e){
      e.preventDefault();
      $(this).ajaxSubmit({ url: '/admin/upload/questions',
                           method: 'post', 
                           success:preview, 
                           error: error,
                           beforeSend: loadingGif
                          });
    });
  }
  //-- Add Question handler
  addQuestion.on('click', showUploadQuestionsTemplate);
  addQuestion2.on('click', showUploadQuestionsTemplate);

  addExam.on('click', () => {
    //-- Load the Candidates from the server
    $.post('/admin/get/candidates',function(data, status){
      var template = $('#add-exam-tmpl').html();
      var html = Mustache.to_html(template, data);
      dashboardPanel.html(html);

      $('#select-all').on('click', function(){
        $('.checkbox').map(function(key, el){
          if(el.getAttribute('checked') === 'checked'){
            el.removeAttribute('checked');
          } else {
            el.setAttribute('checked','checked');
          }
        });
      });
      
      $('#addCandidatesForm').on('submit', function(e){
        e.preventDefault();
        $(this).ajaxSubmit({ url: '/admin/add/exam/candidates/',
                            method: 'post', 
                            success:saved, 
                            error: error,
                            beforeSend: loadingGif
                            });
                          });
    });

    //-- Load the examSchedules from the server
    $.get('/admin/get/exam/schedule',function(data, status){
      var schedules = $('#schedule');
      var eDate;
      var months = ['Jan', 'Feb', 'March', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
                    'Sep', 'Oct', 'Nov', 'Dec'];
      if(data.examSchedules){
        for (var i = 0; i < data.examSchedules.length; i++){
          eDate = new Date(data.examSchedules[i].exam_date); //-- convert the db date
          data.examSchedules[i].exam_date = eDate.getFullYear() + '-' + months[eDate.getMonth()] + '-' + eDate.getDate();
          data.examSchedules[i].dataindex = i;
        }
      }

      var template = '{{#examSchedules}}'+
                       '<option value="{{id}}" dataindex="{{dataindex}}">{{exam_date}}</option>'+
                     '{{/examSchedules}}';
      var html = Mustache.to_html(template, data);
      schedules.append(html);

      //-- once the user selects a schedule
      schedules.on('change', function(e){
        var index = $(this).children('option:selected').attr('dataindex');
        var start = data.examSchedules[index].starts_at;
        var end = data.examSchedules[index].ends_at;
        
        $('#startsAt').val(start);
        $('#endsAt').val(end);

        console.log(start);
      });
    });

  });

  /**
   * Exam Scheduler Handler
   */
  function showExamScheduleTemplate(event){
    var template = $('#add-exam-schedule-tmpl').html();
    var html = Mustache.to_html(template);
    dashboardPanel.html(html);

    var examSchedulerForm = $('#addExamScheduleForm');
    
    examSchedulerForm.on('submit',function(e){
      e.preventDefault();
      $(this).ajaxSubmit({ url: '/admin/add/exam/schedule',
                           method: 'post', 
                           success:saved, 
                           error: error,
                           beforeSend: loadingGif
                          });
                        });  
  }
  addExamSchedule.on('click', showExamScheduleTemplate);
  addExamSchedule2.on('click', showExamScheduleTemplate);
  /**
   * Handles Subject uploads and register
   */

  function showSubjectsTemplate(event){
    var template = $('#add-subject-tmpl').html();
    var html = Mustache.to_html(template, dashboardPanel);
    dashboardPanel.html(html);

    var subjectUploadForm = $('#uploadSubjects');
    subjectUploadForm.on('submit', function(e){
      e.preventDefault();

      $(this).ajaxSubmit({
                          url: '/admin/upload/subjects',
                          method: 'post',
                          success: preview,
                          error: error,
                          beforeSend: loadingGif
                        });
    });


    var addSubjectForm = $('#addSubjectForm');
    addSubjectForm.on('submit',function(e){
      e.preventDefault();
      $(this).ajaxSubmit({ url: '/admin/add/subject',
                           method: 'post', 
                           success:saved, 
                           error: error,
                           beforeSend: loadingGif
                          });
    });
  }
  addSubject.on('click', showSubjectsTemplate);
  addSubject2.on('click', showSubjectsTemplate);

  //-- Views
  viewCandidates.on('click', () => {
    var template = $('#view-candidates-tmpl').html();
    var html = Mustache.to_html(template, dashboardPanel);
    dashboardPanel.html(html);
  });

  subjectsSelect.on('change', function(e){
    var index = e.currentTarget.selectedIndex;
    var id = $(e.currentTarget.item(index)).attr('value')
    window.location.href= "/admin/view/question/"+id+"/1/";
  })
 
});