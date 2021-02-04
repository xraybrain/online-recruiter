/**
 * Module dependencies
 */
const mysql = require("mysql2");

//-- App modules
let {host,user,password,database} = require('./db_config');
let connectionLimit = 10;

function initConn(){
  return mysql.createPool({
    connectionLimit,
    host,
    user,
    password,
    database
  });
}


let conn = initConn();

function connectToDB(){
  return new Promise((resolve, reject)=>{   
    conn.getConnection((err, poolConn)=>{
      if (err) return reject(err);

      return resolve(poolConn);
    });
  });
}

module.exports = connectToDB;