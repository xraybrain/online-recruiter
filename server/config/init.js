const bcrypt   = require('bcryptjs');

const adminRepository = require("../lib/repository/AdminRepos");
const {toSQLDateTime} = require("../lib/helpers/formatter");
function adminConfig(){
  adminRepository.findMany([])
    .then(admins => {
      
      if(admins.length === 0 || !admins){
        let myAdmin = {
          userName: "admin",
          emailAddress: "admin@gmail.com",
          password: "admin",
          pictureDir: "",
          userType: 0,
          createdAt: toSQLDateTime(new Date())
        };

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(myAdmin.password, salt, (err, hash) => {
            if(err) throw err;

            myAdmin.password = hash;
            adminRepository.insert(myAdmin).catch(err=>console.log(err));
          });
        });
      }
    }).catch(err=>console.log(err));
}


module.exports = {adminConfig};