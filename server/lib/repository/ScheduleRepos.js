const CrudRepository = require("../crud/CrudRepository");

class ScheduleRepos extends CrudRepository {
  constructor() {
    super("recruitment_schedule", null);
  }
}

module.exports = new ScheduleRepos();
