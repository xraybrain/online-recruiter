/**
 * module dependencies
 */
const Admin = require("../user/Admin");
const CrudRepository = require("../crud/CrudRepository");

class VacancyRequirementRepos extends CrudRepository {
  constructor() {
    super("vacancy_requirements", null);
  }

  updateMany(data) {
    return new Promise((resolve, reject) => {
      for (let item of data) {
        let { updateData, id } = item;
        super
          .update(updateData, id)
          .then(status => {
            //console.log(status);
            resolve(status);
          })
          .catch(err => {
            reject(err);
          });
      }
    });
  }
}

module.exports = new VacancyRequirementRepos();
