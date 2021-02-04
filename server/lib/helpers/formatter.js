//-- This class helps in formatting data
const moment = require("moment");
class Formatter {
  constructor() {
    this.formatNewVacancyRequirement = (vacancyID, requirements) => {
      let formatted = [];
      if (Array.isArray(requirements) === false) {
        formatted.push({
          vacancy_id: vacancyID,
          requirement: requirements,
          createdAt: this.toSQLDateTime(new Date())
        });
      } else {
        for (const requirement of requirements) {
          formatted.push({
            vacancy_id: vacancyID,
            requirement: requirement,
            createdAt: this.toSQLDateTime(new Date())
          });
        }
      }
      return formatted;
    };

    this.formatVacancy = vacancies => {
      if (Array.isArray(vacancies) === false) return false;

      for (let vacancy of vacancies) {
        vacancy.createdAt = this.formatDateTime(vacancy.createdAt);
      }

      return this.addSerialNo(vacancies);
    };

    this.formatNewExamQuestions = (subjectID, examQuestions = []) => {
      if (Array.isArray(examQuestions) === false) return false;
      let formatted = [];
      for (let question of examQuestions) {
        question.subject_id = subjectID;
        question.createdAt = this.toSQLDateTime(new Date());

        formatted.push(question);
      }

      return formatted;
    };

    this.formatSchedule = (schedules = []) => {
      if (Array.isArray(schedules) === false) return false;

      for (let item of schedules) {
        item.startDate = this.formatDate(item.startDate);
        item.endDate = this.formatDate(item.endDate);
      }

      return this.addSerialNo(schedules);
    };

    this.formatApplicant = applicant => {
      let { dateOfBirth } = applicant;
      if(dateOfBirth !== ""){
        applicant.dateOfBirth = this.formatDate(dateOfBirth);
      }
      return applicant;
    };

    this.formatEducation = educations => {
      if (Array.isArray(educations) === false) return educations;

      for (let education of educations) {
        education.startDate = this.formatDate(education.startDate);
        education.endDate = this.formatDate(education.endDate);
      }

      return educations;
    };

    this.formatActiveExam = (subjects, applicantID) => {
      if(Array.isArray(subjects) === false) return false;

      let formatted = [];

      for(let subject of subjects){
        let {id} = subject;
        formatted.push({
          subject_id: id,
          applicant_id: applicantID,
          createdAt: this.toSQLDateTime(new Date())
        });
      }

      return formatted;
    };
  }

  toSQLDateTime(date) {
    let newDate = new Date(date);
    let sqlDateTime = `${newDate.getFullYear()}-${newDate.getMonth() +
      1}-${newDate.getDate()} ${newDate.getHours()}:${newDate.getMinutes()}:${newDate.getSeconds()}`;

    return sqlDateTime;
  }

  toSQLDate(date) {
    let newDate = new Date(date);
    let sqlDate = `${newDate.getFullYear()}-${newDate.getMonth() +
      1}-${newDate.getDate()}`;

    return sqlDate;
  }

  formatDateTime(date) {
    return moment(date).format("MMM-D-YYYY hh:mm A");
  }

  formatDate(date) {
    return moment(date).format("MMM-D-YYYY");
  }

  addSerialNo(data) {
    let sn = 1;
    if (Array.isArray(data) === false) {
      return data;
    } else {
      for (let item of data) {
        item.sn = sn;
        sn++;
      }
    }

    return data;
  }

  formatVacancyRequirementUpdate(vrid, requirements) {
    let formatted = [];
    if (
      Array.isArray(vrid) === false ||
      Array.isArray(requirements) === false
    ) {
      formatted.push({
        updateData: {
          requirement: requirements
        },
        id: vrid
      });
      return formatted;
    }

    for (let i = 0; i < requirements.length; i++) {
      formatted.push({
        updateData: {
          requirement: requirements[i]
        },
        id: vrid[i]
      });
    }

    return formatted;
  }

  search(haystack = [{}], needle = "", target = "") {
    let found = false;
    // Loop through the haystack
    for (let item of haystack) {
      if (found) break;
  
      // the user has specified a target which is a property to look for
      // so we wouldn't loop through the object
      if (target !== "") {
        if (item.hasOwnProperty(target)) {
          if (item[target] + "" === needle + "") {
            found = item;
            continue;
          }
        }
      } else {
        // no target was provided so we loop through the object
        // note this is a shallow loop
        for (let prop of item) {
          if (item[prop] + "" === needle + "") {
            found = item;
            break;
          }
        }
      }
    }
  
    return found;
  }
}

module.exports = new Formatter();
