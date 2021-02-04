
const CrudRepository = require('../crud/CrudRepository');

class ExamResultRepos extends CrudRepository{
  constructor(){
    super('exam_results', null);
  }
}

module.exports = new ExamResultRepos();