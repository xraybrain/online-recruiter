/**
 * module dependencies
 */
const bcrypt = require("bcryptjs");

const CrudRepository = require("../crud/CrudRepository");

class ApplicantCertificateRepos extends CrudRepository {
  constructor() {
    super("applicant_certificates", null);
  }
}

module.exports = new ApplicantCertificateRepos();
