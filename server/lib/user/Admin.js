/**
 * module dependencies
 */
const User = require('./User');

class Admin extends User{
  constructor(username, emailAddress, password, pictureDir){
    super(emailAddress,password,pictureDir);
    this.username = username;
    this.userType = 0;
  }

  getUsername(){
    return this.username;
  }
  setUsername(name){
    this.username = name;
  }
}

module.exports = Admin;