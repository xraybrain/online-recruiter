/**
 * Module dependencies
 */
const xlsx = require('xlsx');

function to_json(workbook){
  var result = {};
  workbook.SheetNames.forEach(function(sheetName){
    var roa = xlsx.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
    if(roa.length > 0){
      result[sheetName] = roa;
    }
  })
  return result;
}

function read(fileName=String){
  var workbook = xlsx.readFile(fileName);
  return to_json(workbook);
}


module.exports = {
  excelReader: read
};