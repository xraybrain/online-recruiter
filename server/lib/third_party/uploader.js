/**
 * Module dependencies
 */
const fs = require('fs');
const path = require('path');

const formidable = require('formidable');

//-- module data
const allowedTypes = ['jpg', 'jpeg', 'png', 'xlsx'];
const maxFileSize = 2097152;
const minFileSize = 1024;
const targetRootDir = path.join(__dirname, '../../', 'uploads', '/');
const cloudinary = require('cloudinary');

//-- configure cloudinary only in production
if (process.env.NODE_ENV === 'production') {
  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
  });
}

function isAllowedType(filename = String) {
  let ext = path.extname(filename).replace('.', ''); //-- get the file extension

  return allowedTypes.indexOf(ext) === -1 ? false : true;
}

function fileSizeOk(size) {
  return size <= maxFileSize && size >= minFileSize;
}

function upload(
  options = {
    targetDir: '/',
    successRedirect: '/',
    failureRedirect: '/',
    successMsg: 'File uploaded',
    failureMsg: 'Failed to upload file',
  }
) {
  let uploadTo = path.join(targetRootDir, options.targetDir);

  return function (req, res, next) {
    let form = formidable.IncomingForm();
    var uploadStatus = { err: null, msg: '', fileName: '' };

    form.parse(req, (err, fields, files) => {
      if (files.fileToUpload !== undefined) {
        let tempPath = files.fileToUpload.path;
        let fileSize = files.fileToUpload.size;
        let fileName = files.fileToUpload.name;
        let fileMimeType = files.fileToUpload.type;
        let isOk = true; // assume that file can be uploaded
        let errMsg = '';
        req.uploadStatus = uploadStatus;

        if (!isAllowedType(fileName)) {
          isOk = false;
          errMsg = 'This filetype is not allowed';
        }
        if (!fileSizeOk(fileSize)) {
          isOk = false;
          errMsg =
            'filesize must between ' +
            minFileSize / 1024 +
            'kb - ' +
            maxFileSize / (1024 * 1024) +
            'mb';
        }

        if (isOk) {
          //-- check node ennvironment
          if (process.env.NODE_ENV === 'production') {
            //-- on production use cloudinary
            cloudinary.uploader.upload(tempPath, (result) => {
              if (!result.error) {
                uploadStatus.err = null;
                uploadStatus.msg = 'File uploaded';
                uploadStatus.uploadDir = result.secure_url;
                uploadStatus.misc = fields;
                uploadStatus.fileName = result.secure_url;
                uploadStatus.environment = process.env.NODE_ENV;
                req.uploadStatus = uploadStatus;
                return next();
              } else {
                uploadStatus.message = 'Failed to upload file';
                uploadStatus.success = false;
                req.uploadStatus = uploadStatus;
                return next();
              }
            });
          } else {
            //-- on development use local storage
            fs.readdir(uploadTo, (err, filesInDir) => {
              if (err) throw err;

              let newFileName = 'file_' + Date.now() + path.extname(fileName);

              //-- upload file
              fs.readFile(tempPath, (err, data) => {
                if (err) throw err;

                //-- rename fileToUpload
                let newUploadDir = path.join(uploadTo, newFileName);

                fs.writeFile(newUploadDir, data, (err) => {
                  if (err) throw err;
                  uploadStatus.err = null;
                  uploadStatus.msg = 'File uploaded';
                  uploadStatus.uploadDir = newUploadDir;
                  uploadStatus.misc = fields;
                  uploadStatus.fileName = newFileName;
                  req.uploadStatus = uploadStatus;
                  return next();
                });
              });
            });
          }
        } else {
          uploadStatus.err = true;
          uploadStatus.msg = errMsg;
          req.uploadStatus = uploadStatus;
          next();
        }
      }
    });
  };
}

module.exports = upload;
