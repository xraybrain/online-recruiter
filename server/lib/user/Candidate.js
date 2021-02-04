/**
 * module dependencies
 */
const User = require('./User');
namePattern = /^([a-zA-Z]){2,}$/i;
class Candidate extends User{
  constructor(firstName, lastName, middleName, emailAddress, password, pictureDir){
    super(emailAddress, password, pictureDir);
    this.firstName  = firstName;
    this.lastName   = lastName;
    this.middleName = middleName;
  }

  getFirstName(){
    return this.firstName;
  }
  setFirstName(name){
    if(namePattern.test(name)){
      this.firstName = name;
    }
  }
  getLastName(){
    return this.lastName;
  }
  setLastName(name){
    if(namePattern.test(name)){
      this.lastName = name;
      this.userType = 1;
    }
  }
  getMiddleName(){
    return this.middleName;
  }
  setFirstName(name){
    if(namePattern.test(name)){
      this.middleName = name;
    }
  }
}

module.exports = Candidate;