/**
 * This function is used to execute querys while looping through an array
 * @param data an array contain data to be inserted
 * @param fn the main function to execute the query
 */

 function randomGen(lower, upper, limit, sid){
  let randDigit = [];

  for(let i = 1; i <= limit;i++){
    randDigit.push({qNo:Math.floor(Math.random() * upper) + lower, index : i - 1, sid, nIndex: i});
  }
  return randDigit;
 }

module.exports = {randomGen};