/**
 * This configuration file configures the database connection, based on 
 * whether the App is on production or development
 */
const dbString = {};

if(process.env.NODE_ENV === "production"){
  dbString.host = "us-cdbr-iron-east-05.cleardb.net";
  dbString.user = "bdd173866d7d59";
  dbString.password = "0c0e64a9";
  dbString.database = "heroku_c223372fbc3db89";
} else {
  dbString.host = "localhost";
  dbString.user = "root";
  dbString.port = 3306;
  dbString.password = "";
  dbString.database = "online_recruitment";
}

module.exports = dbString;