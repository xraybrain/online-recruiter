
const CrudRepository = require('../crud/CrudRepository');

class ExamSessionRepos extends CrudRepository{
  constructor(){
    super('exam_session', null);
  }
}

module.exports = new ExamSessionRepos();