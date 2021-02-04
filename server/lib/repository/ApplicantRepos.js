/**
 * module dependencies
 */
const bcrypt = require("bcryptjs");

const Candidate = require("../user/Candidate");
const CrudRepository = require("../crud/CrudRepository");

class ApplicantRepos extends CrudRepository {
  constructor() {
    super("applicants", null);
  }
}

module.exports = new ApplicantRepos();
