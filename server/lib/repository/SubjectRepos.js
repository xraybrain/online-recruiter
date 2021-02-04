
const CrudRepository = require('../crud/CrudRepository');

class SubjectRepos extends CrudRepository{
  constructor(){
    super('subjects', null);
  }
}

module.exports = new SubjectRepos();