//-- Module Dependencies
const router = require('express').Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');

//-- Application Modules
const defaults = require('../config/defaults');
const {
  formatNewVacancyRequirement,
  toSQLDateTime,
  formatVacancy,
  addSerialNo,
  formatVacancyRequirementUpdate,
  formatNewExamQuestions,
  toSQLDate,
  formatSchedule,
  formatEducation,
  formatDate,
} = require('../lib/helpers/formatter');
const { examSummary } = require('../src/exam');
const { ensureAuthenticated } = require('../config/auth');
const mail = require('../lib/third_party/mailer');

const uploader = require('../lib/third_party/uploader');
const upload = uploader({ targetDir: '/exams/' });
const { excelReader } = require('../lib/third_party/excel');

//-- Repositories
const vacancyRepository = require('../lib/repository/VacancyRepos');
const vacancyRequirementRepository = require('../lib/repository/VacancyRequirementRepos');
const subjectRepository = require('../lib/repository/SubjectRepos');
const questionRepository = require('../lib/repository/QuestionRepos');
const scheduleRepository = require('../lib/repository/ScheduleRepos');
const applicantRepository = require('../lib/repository/ApplicantRepos');
const applicantCertificateRepository = require('../lib/repository/ApplicantCertificateRepos');
const adminRepository = require('../lib/repository/AdminRepos');

//-- login
router.get('/login/', (req, res) => {
  res.render('admin/login', {
    pageTitle: `${defaults.appName} | Login`,
  });
});
//-- process login
router.post('/login', (req, res, next) => {
  require('../config/passport')(passport, adminRepository);

  passport.authenticate('local', {
    successFlash: true,
    successMessage: 'You have logged in.',
    successRedirect: '/admin/',
    failureFlash: true,
    failureRedirect: '/admin/login/',
  })(req, res, next);
});

//-- dashboard
router.get('/', ensureAuthenticated, (req, res) => {
  applicantRepository.count([]).then(({ total }) => {
    //console.log("total",total);
    res.render('admin/dashboard', {
      pageTitle: defaults.appName,
      total,
    });
  });
});

//-- applicants
router.get('/applicants/', ensureAuthenticated, (req, res) => {
  let { searchText } = req.query;
  let search = [];
  let operator = null;

  if (searchText !== undefined) {
    search.push({
      firstName: `%${searchText}%`,
    });
    operator = 'LIKE';
  }

  applicantRepository
    .findMany(search, operator)
    .then((applicants) => {
      res.render('admin/applicants', {
        pageTitle: `${defaults.appName} | ${defaults.admin[1]}`,
        applicants: addSerialNo(applicants),
      });
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'failed to load page data');
      res.redirect('/admin/');
    });
});

//-- applicant detail
router.get('/applicant/detail/:id/', ensureAuthenticated, (req, res) => {
  let { id } = req.params;

  applicantRepository
    .findJoin(
      {
        vacancy: [{ column: 'name', alias: 'vacancyName' }],
        applicants: [
          { column: 'id' },
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
              res.render('admin/applicant_detail', {
                pageTitle: `${defaults.appName} | Applicant Detail`,
                applicant,
                certificates: formatEducation(certificates),
                summary,
              });
            })
            .catch((err) => {
              console.log(err);
              req.flash('error', 'internal error.');
              res.redirect('/admin/applicants/');
            });
        })
        .catch((err) => {
          console.log(err);
          req.flash('error', 'internal error.');
          res.redirect('/admin/applicants/');
        });
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'internal error.');
      res.redirect('/admin/applicants/');
    });
});

//-- vacancies
router.get('/vacancy/', ensureAuthenticated, (req, res) => {
  let perPage = 10;
  let start = parseInt(req.query.start);
  let prev = start;
  let next = 0;
  let { searchText } = req.query;
  let search = [];
  let operator = null;

  if (searchText !== undefined) {
    search.push({
      name: `%${searchText}%`,
    });
    operator = 'LIKE';
  }

  //-- count total vacancy
  vacancyRepository
    .count([])
    .then(({ total }) => {
      if (total > perPage + start) {
        next = perPage + start;
      }

      vacancyRepository
        .findMany(search, operator, null, { start, size: perPage })
        .then((vacancies) => {
          //console.log(vacancies);
          res.render('admin/vacancy', {
            pageTitle: `${defaults.appName} | ${defaults.admin[2]}`,
            vacancies: formatVacancy(vacancies),
          });
        })
        .catch((err) => {
          console.log(err);
          req.flash('error', 'failed to load page data.');
          res.redirect('/admin/');
        });
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'failed to load page data.');
      res.redirect('/admin/');
    });
});

//-- save new vacancy
router.post('/save/vacancy/', ensureAuthenticated, (req, res) => {
  let { name, requirements } = req.body;
  let newVacancy = {
    name,
    isAvailable: 1,
    createdAt: toSQLDateTime(new Date()),
  };

  //-- ensure that vacancy name exists once
  vacancyRepository
    .findOne([{ name }], '=')
    .then((vacancyExists) => {
      if (vacancyExists !== false) {
        req.flash('error', 'Sorry, vacancy already exists.');
        return res.redirect('/admin/vacancy/?failed=1');
      }

      //-- ok save
      vacancyRepository
        .insert(newVacancy)
        .then((vacancy) => {
          let vacancyRequirements = formatNewVacancyRequirement(
            vacancy.id,
            requirements
          );
          console.log(vacancyRequirements);
          //-- insert this vacancy requirements
          vacancyRequirementRepository
            .insertMany(vacancyRequirements)
            .then((status) => {
              req.flash('success', 'vacancy has been created successfully.');
              res.redirect('/admin/vacancy/?success=1');
            })
            .catch((err) => {
              console.log(err);
              req.flash(
                'error',
                'operation failed, unable to save vacancy requirements.'
              );
              res.redirect('/admin/vacancy/?failed=1');
            });
        })
        .catch((err) => {
          console.log(err);
          req.flash('error', 'operation failed, unable to save new vacancy.');
          res.redirect('/admin/vacancy/?failed=1');
        });
    })
    .catch((err) => {});
});

//-- view vacancy requirements
router.get('/vacancy/requirements/', ensureAuthenticated, (req, res) => {
  let { vid } = req.query;

  vacancyRepository
    .findById(vid)
    .then((vacancy) => {
      //-- return this vacancy requirements
      vacancyRequirementRepository
        .findMany([{ vacancy_id: vid }], '=')
        .then((requirements) => {
          res.render('admin/vacancy_requirements', {
            pageTitle: `${defaults.appName} | vacancy requirements`,
            vacancy,
            requirements: addSerialNo(requirements),
          });
        })
        .catch((err) => {
          console.log(err);
          req.flash(
            'error',
            'Sorry system was unable to fetch vacancy requirements.'
          );
          res.redirect('/admin/vacancy/');
        });
    })
    .catch((err) => {
      console.log(err);
      req.flash(
        'error',
        'Sorry system was unable to fetch vacancy requirements.'
      );
      res.redirect('/admin/vacancy/');
    });
});

//-- edit vacancy
router.get('/edit/vacancy/', ensureAuthenticated, (req, res) => {
  let { vid } = req.query;

  vacancyRepository
    .findById(vid)
    .then((vacancy) => {
      //-- return this vacancy requirements
      vacancyRequirementRepository
        .findMany([{ vacancy_id: vid }], '=')
        .then((requirements) => {
          res.render('admin/edit_vacancy', {
            pageTitle: `${defaults.appName} | vacancy edit`,
            vacancy,
            requirements: addSerialNo(requirements),
          });
        })
        .catch((err) => {
          console.log(err);
          req.flash(
            'error',
            'Sorry system was unable to fetch vacancy requirements.'
          );
          res.redirect('/admin/vacancy/');
        });
    })
    .catch((err) => {
      console.log(err);
      req.flash(
        'error',
        'Sorry system was unable to fetch vacancy requirements.'
      );
      res.redirect('/admin/vacancy/');
    });
});

//-- update vacancy
router.post('/update/vacancy/', ensureAuthenticated, (req, res) => {
  let { name, vid, vrid, requirements } = req.body;
  let requirementsUpdate = formatVacancyRequirementUpdate(vrid, requirements);
  let vacancyUpdate = {
    name,
  };

  //-- update vacancy
  vacancyRepository
    .update(vacancyUpdate, vid)
    .then((status) => {
      console.log(status);
      //-- update the requirements
      vacancyRequirementRepository
        .updateMany(requirementsUpdate)
        .then((status) => {
          console.log(status);
          req.flash('success', 'Vacancy has been updated successfully.');
          res.redirect(`/admin/vacancy/`);
        })
        .catch((err) => {
          console.log(err);
          req.flash(
            'error',
            'operation failed, an error occured while updating data.'
          );
          res.redirect(`/admin/edit/vacancy/?vid=${vid}`);
        });
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'operation failed, unable to update vacancy.');
      res.redirect(`/admin/edit/vacancy/?vid=${vid}`);
    });

  console.log(requirementsUpdate);
});

//-- delete vacancy
router.get('/delete/vacancy/', ensureAuthenticated, (req, res) => {
  let { vid } = req.query;

  //-- delete vacancy and its requirements
  vacancyRepository
    .deleteOne(vid, { id: 'id' })
    .then((result) => {
      console.log(result);
      req.flash('success', 'vacancy has been deleted.');
      res.redirect('/admin/vacancy/');
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'operation failed, unable to delete data');
      res.redirect('/admin/vacancy/');
    });
});

//-- exams
router.get('/exams/mgt/', ensureAuthenticated, (req, res) => {
  let { searchText } = req.query;
  let search = [];
  let operator = null;
  if (searchText !== undefined) {
    search.push({
      name: `%${searchText}%`,
    });
    operator = 'LIKE';
  }
  subjectRepository
    .findMany(search, operator, null)
    .then((subjects) => {
      res.render('admin/exams', {
        pageTitle: `${defaults.appName} | ${defaults.admin[3]}`,
        subjects: addSerialNo(subjects),
      });
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'unable to load page data.');
      res.redirect('/admin/');
    });
});

//-- edit subject
router.get('/edit/subject', ensureAuthenticated, (req, res) => {
  let { sid } = req.query;

  subjectRepository
    .findById(sid)
    .then((subject) => {
      res.render('admin/edit_subject', {
        pageTitle: `${defaults.appName} | Edit Subject`,
        subject,
      });
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'unable to load page data.');
      res.redirect('/admin/');
    });
});

//-- update subject data
router.post('/update/subject/', ensureAuthenticated, (req, res) => {
  let updateData = req.body;
  let id = updateData.id;
  delete updateData.id;

  //-- update
  subjectRepository
    .update(updateData, id)
    .then((status) => {
      req.flash('success', 'subject data has been updated.');
      res.redirect(`/admin/exams/mgt/`);
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'operation failed, unable to update data.');
      res.redirect(`/admin/edit/subject/?sid=${id}`);
    });
});

//-- delete subject
router.get('/delete/subject/', ensureAuthenticated, (req, res) => {
  let { sid } = req.query;

  //-- delete data
  subjectRepository
    .deleteOne(sid, { id: 'id' })
    .then((status) => {
      console.log(status);
      req.flash('success', 'subject data has been deleted.');
      res.redirect(`/admin/exams/mgt/`);
    })
    .catch((err) => {
      console.log(err);
      req.flash(
        'error',
        'operation failed, system was unable to delete subject data.'
      );
      res.redirect(`/admin/exams/mgt/`);
    });
});

//-- save new exam subject
router.post('/save/subject/', ensureAuthenticated, (req, res) => {
  let newSubject = req.body;

  //-- ensure that subject name exists once
  subjectRepository
    .findOne([{ name: newSubject.name }], '=')
    .then((subjectExists) => {
      if (subjectExists !== false) {
        req.flash('error', 'Subject already exists.');
        return res.redirect('/admin/exams/mgt/');
      }

      //-- ok save subject
      subjectRepository
        .insert(newSubject)
        .then((subject) => {
          req.flash('success', `${subject.name} has been saved successfully.`);
          res.redirect('/admin/exams/mgt/');
        })
        .catch((err) => {
          console.log(err);
          req.flash('error', 'operation failed, unable to save data.');
          res.redirect('/admin/exams/mgt/');
        });
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'operation failed, unable to verify subject.');
      res.redirect('/admin/exams/mgt/');
    });
});

//-- subjects question
router.get('/subject/questions/', ensureAuthenticated, (req, res) => {
  let { sid, start } = req.query;
  let prev;
  let next = 1;

  if (start > 1) {
    prev = start - 1;
  } else {
    prev = 1;
  }

  if (start === undefined) {
    start = 1;
  } else {
    start = parseInt(start);
  }

  //--
  questionRepository
    .findMany([{ subject_id: sid }], '=', null, { start, size: 1 })
    .then((examQuestion) => {
      subjectRepository
        .findById(sid)
        .then((subject) => {
          if (examQuestion !== false) {
            examQuestion = examQuestion[0];
          }
          questionRepository
            .count([
              {
                table: 'exam_questions',
                column: 'subject_id',
                value: sid,
                operator: '=',
              },
            ])
            .then(({ total }) => {
              if (total > start) next = start + 1;
              res.render('admin/subject_questions', {
                pageTitle: `${defaults.appName} | Subject Questions`,
                examQuestion,
                subject,
                prev,
                next,
                sid,
                start,
              });
            })
            .catch((err) => {
              console.log(err);
              req.flash('error', 'operation failed, unable to load page data.');
              res.redirect(`/admin/exams/mgt/`);
            });
        })
        .catch((err) => {
          console.log(err);
          req.flash('error', 'operation failed, unable to load page data.');
          res.redirect(`/admin/exams/mgt/`);
        });
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'operation failed, unable to load page data.');
      res.redirect(`/admin/exams/mgt/`);
    });
});

//-- upload file
router.post('/upload/exam/question/',ensureAuthenticated, upload, (req, res) => {
  if (req.uploadStatus.err === true) {
    req.flash('error', 'file upload failed');
    return res.redirect('/admin/subject/questions/');
  }

  let fileName = req.uploadStatus.uploadDir;
  let sid = req.uploadStatus.misc.sid;
  try {
    // read file
    let examQuestion = excelReader(fileName).Sheet1;
    res.render('admin/question_preview', {
      pageTitle: `${defaults.appName} | Question Preview`,
      examQuestion,
      sid,
      fileName,
    });
  } catch (e) {
    console.log(e);
    req.flash('error', 'operation failed, unable to load page data.');
    res.redirect(`/admin/subject/questions/?sid=${sid}`);
  }

  console.log(req.uploadStatus);
});

//-- save question
router.post('/save/exam/question/', ensureAuthenticated, (req, res) => {
  let { fileName, sid } = req.body;

  //-- load the excel file
  try {
    let examQuestions = excelReader(fileName).Sheet1;
    let newExamQuestions = formatNewExamQuestions(sid, examQuestions);

    //-save to db
    questionRepository
      .insertMany(newExamQuestions, 'SN')
      .then((status) => {
        console.log(status);
        req.flash('success', 'subject exam questions saved successfully.');
        res.redirect(`/admin/subject/questions/?sid=${sid}`);
      })
      .catch((err) => {
        console.log(err);
        req.flash(
          'error',
          'operation failed, system was unable to save exam questions'
        );
        res.redirect(`/admin/subject/questions/?sid=${sid}`);
      });
  } catch (e) {
    console.log(e);
    req.flash('error', 'save operation failed');
    res.redirect(`/admin/subject/questions/?sid=${sid}`);
  }
});
//-- recruitment schedules
router.get('/recruitment/schedules/', ensureAuthenticated, (req, res) => {
  scheduleRepository
    .findMany([])
    .then((schedules) => {
      res.render('admin/recruitment_schedules', {
        pageTitle: `${defaults.appName} | ${defaults.admin[4]}`,
        schedules: formatSchedule(schedules),
      });
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'failed to load page data.');
      res.redirect('/admin/');
    });
});

//-- delete recruitment schedule
router.get('/delete/schedule/', ensureAuthenticated, (req, res) => {
  let { rid } = req.query;

  //-- delete
  scheduleRepository
    .deleteOne(rid, { id: 'id' })
    .then((status) => {
      console.log(status);
      req.flash('success', 'schedule has successfully been deleted.');
      res.redirect('/admin/recruitment/schedules/');
    })
    .catch((err) => {
      console.log(err);
      req.flash('error', 'operation failed, system was unable to delete data');
      res.redirect('/admin/recruitment/schedules/');
    });
});

//-- save recruitment schedule
router.post('/save/recruitment/schedule', (req, res) => {
  let { startDate, endDate } = req.body;
  let createdAt = toSQLDateTime(new Date());
  let newSchedule = {
    startDate: toSQLDate(startDate),
    endDate: toSQLDate(endDate),
    createdAt,
  };

  //-- ensure that a schedule exists only once
  scheduleRepository
    .findOne(
      [{ startDate: newSchedule.startDate }, { endDate: newSchedule.endDate }],
      '=',
      'AND'
    )
    .then((scheduleExists) => {
      if (scheduleExists !== false) {
        req.flash('error', 'Schedule already exists.');
        return res.redirect('/admin/recruitment/schedules/');
      }

      //-- save schedule
      scheduleRepository
        .insert(newSchedule)
        .then((schedule) => {
          req.flash('success', 'Recruitment has been scheduled.');
          res.redirect('/admin/recruitment/schedules/');
        })
        .catch((err) => {
          console.log(err);
          req.flash(
            'error',
            'operation failed, system was unable to save schedule.'
          );
          res.redirect('/admin/recruitment/schedules/');
        });
    })
    .catch((err) => {
      console.log(err);
      req.flash(
        'error',
        'operation failed, system was unable to verify recruitment schedule.'
      );
      res.redirect('/admin/recruitment/schedules/');
    });
});

router.post('/send/mail/', ensureAuthenticated, (req, res) => {
  let { emailAddress, message, subject, id } = req.body;

  mail({
    to: emailAddress,
    from: '<myproject2019@aol.com>',
    text: message,
    subject,
  })
    .then((info) => {
      console.log('mail info', info);
    })
    .catch((err) => {
      console.log(err);
    });

  req.flash('success', 'mail has been sent successfully.');
  res.redirect(`/admin/applicant/detail/${id}`);
});

router.post('/update/profile', ensureAuthenticated, (req, res, next) => {
  let { id } = req.user;
  let { userName, emailAddress } = req.body;
  if (userName && emailAddress) {
    let updateData = {
      userName,
      emailAddress,
    };
    adminRepository
      .update(updateData, id)
      .then((user) => {
        if (user) {
          req.flash('success', 'profile updated successfully.');
          return res.redirect('/admin/');
        } else {
          req.flash('error', 'failed to update profile.');
          return res.redirect('/admin/');
        }
      })
      .catch((error) => {
        console.log(error);
        req.flash('error', 'failed to update profile.');
        return res.redirect('/admin/');
      });
  } else {
    req.flash('error', 'failed to update profile.');
    return res.redirect('/admin/');
  }
});

router.post('/reset/password', ensureAuthenticated, (req, res, next) => {
  let { id } = req.user;
  let { password, confirmPassword } = req.body;

  if (password === confirmPassword) {
    let salt = bcrypt.genSaltSync(12);
    password = bcrypt.hashSync(password, salt);
    adminRepository
      .update({ password }, id)
      .then((user) => {
        if (user) {
          req.flash('success', 'Password changed successfully.');
          return res.redirect('/admin/login');
        } else {
          req.flash('error', 'Failed to reset password.');
          return res.redirect('/admin/');
        }
      })
      .catch((error) => {
        req.flash('error', 'Failed to reset password.');
        return res.redirect('/admin/');
      });
  } else {
    req.flash('error', 'Password mismatch.');
    return res.redirect('/admin/');
  }
});

module.exports = router;
