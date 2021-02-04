
const CrudRepository = require('../crud/CrudRepository');

class SessionsRepos extends CrudRepository{
  constructor(){
    super('sessions', null);
  }
}

module.exports = new SessionsRepos();