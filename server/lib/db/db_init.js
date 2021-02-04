/**
 * Module dependencies
 */
const fs = require('fs');
const path = require('path');

const mysql = require("mysql");

//-- DB connection strings
const {host, user, password} = require('./db_config');

const connection = mysql.createConnection({
  host,
  user,
  password
});

// **************************************
// -- Variables declared here
let initFile = "db.sql";
let initFilePath = path.join(__dirname, './', initFile);

/**
 * Initialize the database
 */
function initDB() {
  return new Promise((resolve, reject)=>{
    connection.connect((err)=>{
      if(err){
        reject("Unable to connect to MySql Server");
        return console.log(err);
      }

      //-- connected to Mysql server
      fs.readFile(initFilePath, (err, initQuery) => {
        if(err){
          console.log("db.sql file not found in the same directory");
          return reject("Failed to initialize database.");
        }

        //-- the file was read
        initQuery = initQuery.toString();
        initQuery = (initQuery.split(/;/)); // break the query into array
        initQuery.pop(); // removes the last element of the array is empty string

        // loops through the initQuery array executing each query
        for(let q of initQuery){
          q = q + ";";
          connection.query(q,(err)=>{
            if(err){
              console.log(err.code);
              return reject('Error Occured while initializing the database')
            }
          }); //-- end of query
        }
        resolve(true);
      }); //-- end of db init file read
    }); //-- end of connection
  }); //-- end of promise
}


module.exports = {initDB};