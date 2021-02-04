/**
 * 
 */

class User {
  constructor( emailAddress= String, password= String,pictureDir) 
  { // constructor function
    this.emailAddress = emailAddress;
    this.password = password;
    if(pictureDir !== undefined){
      this.pictureDir = pictureDir;
    }
  }
  getEmailAddress(){
    return this.emailAddress;
  }
  setEmailAddress(emailAddress){
    let pattern = /^(\w)+?@(\w)+?\.(com|net|uk)+?$/i;
    if(pattern.test(emailAddress)){
      this.emailAddress = emailAddress;
    }
  }
  getPictureDir(){
    return this.pictureDir;
  }
  setPictureDir(dir){
    this.pictureDir = dir;
  }
}

module.exports = User;