/**
 * module dependencies
 */
const CrudRepository = require("../crud/CrudRepository");

class VacancyRepos extends CrudRepository {
  constructor() {
    super("vacancy", null);
  }
}

module.exports = new VacancyRepos();
