const router = require('express').Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');

//-- app modules
const defaults = require('../config/defaults');
const uploader = require('../lib/third_party/uploader');
const upload = uploader({ targetDir: '../../public/uploads/' });
const {
  initExam,
  inExamSession,
  setCheckedOption,
  submitExam,
  examSummary,
} = require('../src/exam');
const {
  toSQLDateTime,
  toSQLDate,
  formatApplicant,
  formatDate,
  formatEducation,
} = require('../lib/helpers/formatter');
const {
  ensureAuthenticated,
  ensureExamIsTakenOnce,
  isSubmitted,
} = require('../config/auth');

//-- repository
const examSessionRepository = require('../lib/repository/ExamSessionRepos');
const applicantRepository = require('../lib/repository/ApplicantRepos');
const vacancyRepository = require('../lib/repository/VacancyRepos');
const applicantCertificateRepository = require('../lib/repository/ApplicantCertificateRepos');
const activeExamRepository = require('../lib/repository/ActiveExamRepos');
const examResultRepository = require('../lib/repository/ExamResultRepos');
const scheduleRepository = require('../lib/repository/ScheduleRepos');

router.get('/register/', (req, res) => {
  //-- check if there is an active recruitment
  let today = toSQLDate(new Date());

  scheduleRepository
    .findOne([{ endDate: today }], '>=')
    .then((schedule) => {
      // console.log(schedule);
      res.render('applicant/register', {
        pageTitle: `${defaults.appName} | New Application`,
        schedule,
      });
    })
    .catch((err) => {
      req.flash('error', 'Failed to load page data.');
      res.redirect('/');
    });
});

//-- register new applicant
router.post('/register/applicant/', (req, res) => {
  let { password, emailAddress } = req.body;
  emailAddress = emailAddress.toLowerCase();

  //-- check if this email already exists
  applicantRepository
    .findOne([{ emailAddress }], '=')
    .then((emailExists) => {
      if (emailExists !== false) {
        req.flash('error', 'Email address already exists');
        return res.redirect('/applicant/register/');
      }

      //-- ok encrypt user password
      bcrypt.genSalt(12, (err, salt) => {
        if (err) throw err;
        bcrypt.hash(password, salt, (err, hash) => {
          if (err) throw err;
          let newApplicant = {
            emailAddress,
            password: hash,
            createdAt: toSQLDateTime(new Date()),
          };

          //-- save applicant details
          applicantRepository
            .insert(newApplicant)
            .then((applicant) => {
              req.flash('success', 'registeration was successful.');
              res.redirect('/applicant/login');
            })
            .catch((err) => {
              console.log(err);
              req.flash('error', 'registeration was unsuccessful.');
              res.redirect('/applicant/register');
            });
        });
      });
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'operation failed, unable to verify email.');
      res.redirect('/applicant/register');
    });
});

//-- login
router.get('/login/', (req, res) => {
  res.render('applicant/login', {
    pageTitle: `${defaults.appName} | Applicant Login`,
  });
});

//-- process login
router.post('/login/', (req, res, next) => {
  require('../config/passport')(passport, applicantRepository);

  passport.authenticate('local', {
    successFlash: true,
    successRedirect: '/applicant/application',
    failureFlash: true,
    failureRedirect: '/applicant/login/',
  })(req, res, next);
});

router.get('/application/', isSubmitted, (req, res) => {
  //-- logged in user  id
  let { id } = req.user;

  applicantRepository
    .findById(id)
    .then((applicant) => {
      //-- get vacancies
      vacancyRepository
        .findMany([])
        .then((vacancies) => {
          applicantCertificateRepository
            .findMany([{ applicant_id: id }], '=')
            .then((applicantEducation) => {
              res.render('applicant/application', {
                pageTitle: `${defaults.appName} | Application`,
                applicant: formatApplicant(applicant),
                vacancies,
                applicantEducation: formatEducation(applicantEducation),
              });
            })
            .catch((err) => {
              console.log(err);
              req.flash('error', 'failed to load page data');
              res.redirect('/');
            });
        })
        .catch((err) => {
          console.log(err);
          req.flash('error', 'failed to load page data');
          res.redirect('/');
        });
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'failed to load page data');
      res.redirect('/');
    });
});

//-- update personal details
//-- ajax request
router.post('/update/personal/detail/', ensureAuthenticated, (req, res) => {
  let updateData = req.body;
  updateData.completedPersonal = 1;

  if (updateData.dateOfBirth)
    updateData.dateOfBirth = toSQLDate(updateData.dateOfBirth);

  console.log(updateData);

  // logged in user id
  let { id } = req.user;

  //-- update applicant data
  applicantRepository
    .update(updateData, id)
    .then((status) => {
      console.log(status);
      res.send({ err: null, nextForm: 'contactForm' });
    })
    .catch((err) => {
      res.send({ err: true, msg: 'failed to save personal details' });
    });
});

//-- AJAX request update user contact
router.post('/update/contact/', ensureAuthenticated, (req, res) => {
  let { phoneNo, address } = req.body;
  let { id } = req.user;

  let updateData = {
    address: address.toLowerCase(),
    phoneNo,
    completedContact: 1,
  };

  //-- update applicant contact
  applicantRepository
    .update(updateData, id)
    .then((status) => {
      console.log(status);
      res.send({ err: null, nextForm: 'educationForm' });
    })
    .catch((err) => {
      res.send({ err: true, msg: 'Internal error' });
    });
});

//-- AJAX request
//-- Save applicant education details
router.post('/save/education/', ensureAuthenticated, (req, res) => {
  let { school, title, startDate, endDate } = req.body;
  let { id } = req.user;

  let newEducation = {
    school,
    title,
    startDate: toSQLDate(startDate),
    endDate: toSQLDate(endDate),
    createdAt: toSQLDateTime(new Date()),
    applicant_id: id,
  };

  //-- save
  applicantCertificateRepository
    .insert(newEducation)
    .then((education) => {
      let { startDate, endDate } = education;
      education.startDate = formatDate(startDate);
      education.endDate = formatDate(endDate);

      applicantRepository
        .update({ completedEducation: 1 }, id)
        .then((status) => {
          res.send({ err: null, education, nextForm: 'isEducation' });
        })
        .catch((err) => {
          res.send({ err: true, msg: 'failed to update applicant data' });
        });
    })
    .catch((err) => {
      res.send({ err: true, msg: 'failed to save education details' });
    });
});

//-- AJAX requests
//-- Verify if applicant has completed a form
router.get('/has/completed/form/', ensureAuthenticated, (req, res) => {
  let { form } = req.query;
  let { id } = req.user;

  applicantRepository
    .findById(id)
    .then(({ completedPersonal, completedContact, completedEducation }) => {
      let status;
      let nextForm;
      switch (form) {
        case 'personalForm':
          status = completedPersonal;
          nextForm = 'contactForm';
          break;
        case 'contactForm':
          status = completedContact;
          nextForm = 'educationForm';
          break;
        case 'educationForm':
          status = completedEducation;
          nextForm = 'writeExam';
          break;
      }
      res.send({
        err: null,
        status,
        nextForm,
      });
    })
    .catch((err) => {
      console.log(err);
      res.send({ err: true, msg: 'internal error' });
    });
});

//-- upload passport
router.post('/upload/passport/', upload, (req, res) => {
  if (req.uploadStatus.err !== null) {
    return res.send({ err: true, msg: 'file upload failed.' });
  }

  let { fileName, uploadDir } = req.uploadStatus;
  if (!process.env.NODE_ENV) fileName = `/uploads/${fileName}`;
  res.send({ err: null, fileName, uploadDir });
});

//-- start exam
router.get(
  '/start/exam/',
  ensureAuthenticated,
  ensureExamIsTakenOnce,
  (req, res) => {
    let { id } = req.user;

    initExam(id)
      .then((data) => {
        // console.log(data);
        //-- setup exam session
        let { sid, randomQuestions, examLimit, examTime } = data;
        //-- setup examTime in session
        req.session.examTime = examTime;

        req.session.examQuestions = randomQuestions;
        res.redirect(`/applicant/exam/?sid=${sid}&qn=0`);
      })
      .catch((err) => {
        console.log(err);
      });
  }
);

//-- exam
router.get('/exam/', ensureAuthenticated, (req, res) => {
  let { sid, qn, request } = req.query;
  let { examQuestions } = req.session;
  let { id } = req.user; //-- logged in applicant id
  let question;
  let qid;
  if (qn !== undefined) {
    question = examQuestions[qn];
    qid = question.id;
  }

  //-- check if the applicant has already answered this question
  inExamSession(qid, id, qn)
    .then((examSession) => {
      question = setCheckedOption(examSession, question) || question;

      //-- check how the client requested for this page (ajax get request or http get request)
      if (request === 'ajax') {
        question.equals = (a, b) => {
          return a === b;
        };

        res.send({
          question,
        });
      } else {
        res.render('applicant/exam', {
          pageTitle: `${defaults.appName} | Exam`,
          question,
          examQuestions,
          sid,
          qn,
          totalQn: examQuestions.length,
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.send({
        err: true,
        msg: 'failed to verify if question is already answered.',
      });
    });
});

//-- submit question answer in exam session
router.post('/submit/answer/', ensureAuthenticated, (req, res) => {
  let { qid, qNo, sid, selectedOption } = req.body;
  let { id } = req.user; //-- logged in user id;

  //-- verify if the user has already answered this question previously
  examSessionRepository
    .findOne([{ question_id: qid }, { applicant_id: id }, { qNo }], '=', 'AND')
    .then((examSessionExists) => {
      if (examSessionExists !== false) {
        let { id } = examSessionExists;
        //-- update this with the new answer
        examSessionRepository
          .update({ selectedOption }, id)
          .then((status) => {
            // console.log(status);
            res.send({ err: null, msg: 'answer updated.' });
          })
          .catch((err) => {
            console.log(err);
            res.send({ err: true, msg: 'failed to update answer.' });
          });
      } else {
        //-- new answer is new insert it
        let newExamSession = {
          applicant_id: id,
          question_id: qid,
          subject_id: sid,
          selectedOption,
          qNo,
          createdAt: toSQLDateTime(new Date()),
        };
        examSessionRepository
          .insert(newExamSession)
          .then((examSession) => {
            res.send({ err: null, msg: 'answer saved.' });
          })
          .catch((err) => {
            res.send({ err: true, msg: 'failed to insert answer.' });
          });
      }
    })
    .catch((err) => {
      res.send({ err: true, msg: 'verify if session exists.' });
    });
});

//-- get exam time
router.get('/exam/time/', ensureAuthenticated, (req, res) => {
  res.send(req.session.examTime);
});

//-- set exam time
router.post('/update/exam/time/', ensureAuthenticated, (req, res) => {
  let time = req.body;

  req.session.examTime = time;
  //console.log(req.body);
  res.send({ err: null });
});

//-- submit exam
router.get('/submit/exam', ensureAuthenticated, (req, res) => {
  let { id } = req.user;
  let { sid } = req.query;

  console.log(id, sid);

  submitExam(id, sid)
    .then((examData) => {
      // console.log(examData);

      if (examData === false) {
        //-- this is the final paper display exam summary
        return examSummary(id)
          .then((summary) => {
            //console.log("summary", summary);
            req.flash('examSummary', summary);
            res.redirect('/applicant/application/');
          })
          .catch((err) => {
            console.log(err);
          });
      }

      //-- load next question
      //-- setup exam session
      let { sid, randomQuestions, examTime } = examData;
      //-- setup examTime in session
      req.session.examTime = examTime;

      req.session.examQuestions = randomQuestions;
      res.redirect(`/applicant/exam/?sid=${sid}&qn=0`);
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'Operation failed, unable to submit exam');
    });
});

router.get('/exam/completed/', ensureAuthenticated, (req, res) => {
  let { id } = req.user;

  examResultRepository
    .findOne([{ applicant_id: id }], '=')
    .then((examResult) => {
      if (examResult === false) return res.send({ err: null, status: false });

      res.send({ err: null, status: true, nextForm: 'previewApplication' });
    })
    .catch((err) => {
      console.log(err);
      res.send({ err: true, msg: 'failed to verify if exam has been taken.' });
    });
});

router.get('/preview/application', ensureAuthenticated, (req, res) => {
  //-- get this applicant
  let { id } = req.user;

  applicantRepository
    .findJoin(
      {
        vacancy: [{ column: 'name', alias: 'vacancyName' }],
        applicants: [
          { column: 'firstName' },
          { column: 'lastName' },
          { column: 'middleName' },
          { column: 'dateOfBirth' },
          { column: 'emailAddress' },
          { column: 'phoneNo' },
          { column: 'pictureDir' },
        ],
      },
      {
        vacancy: 'vacancy_id',
      },
      [{ table: 'applicants', column: 'id', value: id, operator: '=' }]
    )
    .then((applicant) => {
      if (Array.isArray(applicant)) {
        // applicant = formatApplicant(applicant);
        applicant = applicant[0];
        applicant.dateOfBirth = formatDate(applicant.dateOfBirth);
      }
      //-- get this applicant cert
      applicantCertificateRepository
        .findMany([{ applicant_id: id }], '=')
        .then((certificates) => {
          //-- get exam summary
          examSummary(id)
            .then((summary) => {
              res.render('applicant/preview_application', {
                pageTitle: `${defaults.appName} | Application Preview`,
                applicant,
                certificates: formatEducation(certificates),
                summary,
              });
            })
            .catch((err) => {
              console.log(err);
              req.flash('error', 'internal error.');
              res.redirect('/applicant/application/');
            });
        })
        .catch((err) => {
          console.log(err);
          req.flash('error', 'internal error.');
          res.redirect('/applicant/application/');
        });
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'internal error.');
      res.redirect('/applicant/application/');
    });
});

//-- submit Application
router.get('/submit/application/', ensureAuthenticated, (req, res) => {
  let { id } = req.user;

  //-- update applicant
  applicantRepository
    .update({ isSubmitted: 1 }, id)
    .then((status) => {
      console.log(status);
      res.redirect('/applicant/application/completed/');
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'Operation failed, internal error.');
      res.redirect('/applicant/application/');
    });
});

router.get('/application/completed/', ensureAuthenticated, (req, res) => {
  console.log('application completed');

  //-- get this applicant
  let { id } = req.user;

  applicantRepository
    .findJoin(
      {
        vacancy: [{ column: 'name', alias: 'vacancyName' }],
        applicants: [
          { column: 'firstName' },
          { column: 'lastName' },
          { column: 'middleName' },
          { column: 'dateOfBirth' },
          { column: 'emailAddress' },
          { column: 'phoneNo' },
          { column: 'pictureDir' },
        ],
      },
      {
        vacancy: 'vacancy_id',
      },
      [{ table: 'applicants', column: 'id', value: id, operator: '=' }]
    )
    .then((applicant) => {
      if (Array.isArray(applicant)) {
        // applicant = formatApplicant(applicant);
        applicant = applicant[0];
        applicant.dateOfBirth = formatDate(applicant.dateOfBirth);
      }
      //-- get this applicant cert
      applicantCertificateRepository
        .findMany([{ applicant_id: id }], '=')
        .then((certificates) => {
          //-- get exam summary
          examSummary(id)
            .then((summary) => {
              res.render('applicant/printout', {
                pageTitle: `${defaults.appName} | Application Preview`,
                applicant,
                certificates: formatEducation(certificates),
                summary,
              });
            })
            .catch((err) => {
              console.log(err);
              req.flash('error', 'internal error.');
              res.redirect('/applicant/application/');
            });
        })
        .catch((err) => {
          console.log(err);
          req.flash('error', 'internal error.');
          res.redirect('/applicant/application/');
        });
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'internal error.');
      res.redirect('/applicant/application/');
    });
});

module.exports = router;
