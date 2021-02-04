const CrudRepository = require('../crud/CrudRepository');

class QuestionRepos extends CrudRepository {
  constructor() {
    super('exam_questions', null);
  }

  countTotal(sid) {
    return new Promise((resolve, reject) => {
      super.findMany([{subject_id: sid}])
        .then((questions) => {
          if(questions){
            return resolve(questions.length); 
          }
          return resolve(questions);
        }, (err) => {
          reject(err);
        });
    });
  }
}

module.exports = new QuestionRepos();