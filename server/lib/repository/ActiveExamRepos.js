
const CrudRepository = require('../crud/CrudRepository');
const ActiveExam = require('../user/ActiveExam');

class ActiveExamRepos extends CrudRepository{
  constructor(){
    super('active_exams', null);
  }
}

module.exports = new ActiveExamRepos();