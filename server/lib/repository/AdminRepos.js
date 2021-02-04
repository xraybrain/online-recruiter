/**
 * module dependencies
 */
const Admin = require("../user/Admin");
const CrudRepository = require("../crud/CrudRepository");

class AdminRepos extends CrudRepository {
  constructor() {
    super("admins", null);
  }
}

module.exports = new AdminRepos();
