/**
 * This module ensures the security of routes
 */

const { toMinute } = require('../lib/helpers/time');
const examResultRepository = require('../lib/repository/ExamResultRepos');
const applicantRepository = require('../lib/repository/ApplicantRepos');
const scheduleRepository = require('../lib/repository/ScheduleRepos');

function ensureAuthenticated(req, res, next) {
  //-- checks if user has logged in
  if (req.isAuthenticated()) {
    return next();
  }

  //-- user has not logged in
  req.flash('error', 'You must login before you can view this page.');
  res.redirect('/');
}

function ensureExamIsTakenOnce(req, res, next) {
  let { id } = req.user;

  examResultRepository
    .findOne([{ applicant_id: id }], '=')
    .then((result) => {
      console.log('verified', result);
      if (result === false) {
        return next();
      }

      req.flash('error', 'You have already taken the exam.');
      res.redirect('/applicant/application/');
    })
    .catch((err) => {
      req.flash('error', 'Failed to verify exam status.');
      res.redirect('/applicant/application/');
    });
}

function ensureIsExamDate(req, res, next) {
  let ngTimeZone = new Date().toLocaleString('en-US', {
    timeZone: 'Africa/Lagos',
  });
  let today = new Date(ngTimeZone);
  let currentDate = `${today.getFullYear()}-${
    today.getMonth() + 1
  }-${today.getDate()}`;
  let currentTime = `${today.getHours()}:${today.getMinutes()}:00`;
  examScheduleRepository
    .findOne([{ exam_date: currentDate }], '=')
    .then((schedule) => {
      let currentTimeInMinutes = toMinute(currentTime);
      let startsAtInMinutes = toMinute(schedule.starts_at);
      let endsAtInMinutes = toMinute(schedule.ends_at);
      console.log(currentTime);
      console.log(schedule.starts_at);
      console.log(schedule.ends_at);
      //console.log(schedule.starts_at);
      if (
        currentTimeInMinutes >= startsAtInMinutes &&
        currentTimeInMinutes <= endsAtInMinutes
      ) {
        console.log('Exam is on...');
        return next();
      }

      req.flash('error', 'We are sorry, no exam is scheduled today.');
      res.redirect('/');
    })
    .catch((err) => {
      req.flash('error', 'Failed to retrieve sechdule.');
      return res.redirect('/');
    });
}

function isSubmitted(req, res, next) {
  if (req.user) {
    let { id } = req.user;

    applicantRepository
      .findById(id)
      .then((applicant) => {
        if (applicant.isSubmitted === 1) {
          return res.redirect('/applicant/application/completed/');
        }
        next();
      })
      .catch((err) => {
        req.flash('error', 'Failed to retrieve applicant.');
        return res.redirect('/');
      });
  } else {
    req.flash('error', 'Failed to retrieve applicant.');
    return res.redirect('/');
  }
}

module.exports = {
  ensureAuthenticated,
  ensureExamIsTakenOnce,
  isSubmitted,
  ensureIsExamDate,
};
