/**
 * Module dependencies
 */
const conn = require('../db/db_connect');

/**
 * This class performs the CRUD (Create, Retrieve, Update, Delete) operations in this APP
 */
class CrudRepository{
  constructor(tableName, mapToDb={}){
    this.table = tableName;
    this.id;
    this.db = conn;
    this.mapToDb = mapToDb || {};
  }
  execute (query, values){
    values = values || null;
    return new Promise((resolve, reject)=>{
      this.db()
          .then((conn)=>{
            conn.query(query, values, (err, res)=>{
              if(err){
                conn.release()//-- end db connection
                return reject("Failed to execute query [" + err.code + "]");
              }
              conn.release()//-- end db connection //-- end db connection
              //-- the query executes successfully
              return resolve(res);
            });
          },(err)=>{
            //-- error occured while connecting db server
            return reject(err);
          });
    });
  }

  /**
   * 
   * @param {*} where an array of objects
   *    object prop includes
   *    table: table name on this codition is to be applied
   *    column : table column
   *    value : column value
   *    operator : operator to be used to validate condition
   *    nextOperator : this must be added if there are more conditions
   */
  whereClause (where=[]) {
    let query = '';

    //-- the where clause
    if (where.length > 0){
      query += 'WHERE '
      for (const clause of where){
        query += ` \`${clause.table}\`.\`${clause.column}\` ${clause.operator} '${clause.value}' `;

        if (clause.nextOperator){
          query += ` ${clause.nextOperator} `
        }
      }
    }

    return query;
  }

  formatInsertQuery(obj={}, ignoreProp=null){
    if(obj === null){
      return {err:1, msg: "Object is expected"};
    }

    let tick = '`';
    let columns = '';
    let values  = '';
    let query = `INSERT INTO ${tick}${this.table}${tick}`;
    //-- loop through this object
    for(let item in obj){
      if(item !== ignoreProp){
        if(obj.hasOwnProperty(item)){
          //-- this helps to map the obj property with table columns
          if(this.mapToDb.hasOwnProperty(item)){
            columns += '`' + this.mapToDb[item] + "`, ";
          } else {
            columns += '`' + item + "`, ";
          }

          values  += '"' + obj[item] + '", ';
        }
      }
    }

    // removes the ending comma
    columns = (columns.endsWith(', '))? '\n(' + columns.substr(0, columns.lastIndexOf(', ')) + ')' : '(' + columns + ')';

    values = (values.endsWith(', '))? '\n(' + values.substr(0, values.lastIndexOf(', ')) + ')': '(' + values + ')';

    query += columns + "\nVALUES" + values;
    return {err:null, query};
  }

  insert(obj={}){
    
    return new Promise((resolve, reject)=>{
      obj = obj || reject("Object is expected");
      let query = this.formatInsertQuery(obj).query || reject("query failed to formatted");
      this.execute(query, null)
          .then(res=>{
            this.findById(res.insertId)
                .then(data=>{
                  return resolve(data);
                },e => {
                  console.log(e);
                  return reject("Failed to retrieve submitted data");
                });
          },err => {
            console.log(err)
            return reject("Unable to save data.");
          });
    });

  }

  insertMany(data=[], ignoreProp=null){
    return new Promise((resolve, reject)=>{
      if(Object.prototype.toString.call(data) !== '[object Array]'){
        return reject('data must be an array');
      }

      let query;
      let result = [];

      for(const obj of data){
        query = this.formatInsertQuery(obj, ignoreProp).query;
        this.execute(query)
          .then(resObj => {
            result.push({err: null, ok: true, msg: 'data inserted'});
            resolve(result);
          }, err =>{
            result.push({err: true, msg: 'some data failed to insert \n ' + err});
            return reject(result);
          })
      }
    });
  }

  

  findById(id){
    return new Promise((resolve, reject)=>{
      if(id === undefined){
        return reject("Id must be supplied");
      }
  
      let tick  = '`';
      let query = `SELECT * FROM ${tick}${this.table}${tick} WHERE `;
      query += `${tick}id${tick}=?`;

      this.execute(query,id)
          .then(res=>{
            resolve(res[0]);
          },
          err=>{
            console.log(err);
            reject("Unable to fetch data");
          });
    });
  }

  findOne(where=[{"table_column":''}], operator="=", joinOperator="AND"){
    return new Promise((resolve, reject)=>{
      this.findMany(where, operator, joinOperator)
          .then(data=>{
            if(!data){
              return resolve(false);
            }
            return resolve(data[0]);
          }, err =>{
            return reject("Unable to retrieve data. " + err);
          });
      });
  }

  findMany(where=[{"table_column":''}], operator="=", joinOperator="AND", limit={start:-1,size:0}){
    return new Promise((resolve, reject)=>{
      let query = `SELECT * FROM \`${this.table}\` `;
      
      
      if(where.length !== 0){
        let clause = " WHERE ";
        let pos = 0;
        for (const item of where){
          pos += 1;
          for(let prop in item){
            if(item.hasOwnProperty(prop)){
              
              if(this.mapToDb.hasOwnProperty(prop)){
                clause += `\`${this.mapToDb[prop]}\` ${operator} "${item[prop]}"`;
              }else{
                clause += `\`${prop}\` ${operator} "${item[prop]}"`;
              }
              if(pos < where.length){
                clause += ` ${joinOperator} `;
              }
            }
          }
        } 
        pos = 0;
        query += clause + "";
      } 

      if(limit.start > -1 ) {
        query += " limit "+limit.start;

        if(limit.size > 0) {
          query += ","+limit.size
        }
      }

      query += ';';

      //console.log(query);

      this.execute(query, null)
          .then((data)=>{
            if(data.length === 0){
              return resolve(false);
            }
            resolve(data);
          }, (e)=>{
            console.log(e);
            reject("[findMany] Unable to retrieve data.")
          });
    });
  }


  findJoin(tables={table:[{}]}, rel={}, where=[], orderBy=[]){
    return new Promise((resolve, reject)=>{
      let query = "SELECT ";
      let joinClause = '';

      let more = 1;
      let tabLen = Object.keys(tables).length; //-- get the length of this obj

      for (let table in tables){
        //--ensures that table value is tables direct property not inherited or copied
        if (tables.hasOwnProperty(table)){ 

          //-- Fomulate the join clause
          if(table !== this.table && rel.hasOwnProperty(table)){
            joinClause += ' INNER JOIN `' + table + '` ON  (`' + this.table + '`.`' + rel[table] + '` = `' + table + '`.`id`)';
          } //-- end of join clause

          // checks the length of the array
          if(tables[table].length > 0){
            //-- retreiving columns for this table
            //-- essence of this is to capture all columns to be retreived from this join query
            let colCounter = 1;
            let colLen = tables[table].length;

            for (const tabCol of tables[table]){
              query += '`' + table + '`.`' + tabCol.column + '`';
              
              if(tabCol.alias){
                query += ' AS `' + tabCol.alias + '`'; 
              } else {
                //-- The caller may intend to use the column name as the alias
                query += ' AS `' + tabCol.column + '`'; 
              }
              //-- appends comma to query while there are more columns
              if(colCounter < colLen){
                query += ', '
              }
              ++colCounter;
            } //-- end of column loop
          } //-- end of decision for table length

        }
        //-- appends comma when necessary
        if(more < tabLen){
          query += ',';
        } 
        ++more;
      }
      query += ' FROM `' + this.table + '` ' + joinClause;
      query += this.whereClause(where);

      if(orderBy.length > 0){
        let count = 1;
        query += ` ORDER BY `;

        for (let i = 0; i < orderBy.length; i++){
          query += ` \`${orderBy[i].table}\`.\`${orderBy[i].column}\` ${orderBy[i].order}`;

          if(count < orderBy.length){
            query += ", ";
          }
          count++
        }
      }
      query += ';';
      //--console.log(query);
      this.execute(query, null)
          .then((data)=>{
            if(data.length === 0){
              return resolve(false);
            }
            resolve(data);
          }, (e)=>{
            console.log(e);
            reject("Unable to retrieve data. " + e);
          });
    });
  }

  findOneAndDelete(where=[{"table_column":''}], operator="=", joinOperator="AND"){
    return new Promise((resolve, reject)=>{
      this.findOne(where, operator, joinOperator)
        .then(result=>{
          if(result){
            this.deleteOne(result.id)
              .then(status=>{
                resolve(status);
              })
              .catch(err=>{
                reject("[FindOneAndDelete] " + err);
              });
          }else{
            resolve(result)
          }
        })
        .catch(err=>{
          reject("[FindOneAndDelete][findOne] " + err);
        })
    });
  }

  deleteOne(id, alias={}){
    if(id === undefined){
      return Promise.reject("Id must be supplied");
    }
    let column = 'id';
    if(alias.hasOwnProperty('id')){
      column = alias.id;
    }

    let query = `DELETE FROM \`${this.table}\` WHERE \`${column}\`=?;`;


    return new Promise((resolve, reject)=>{
      this.execute(query, id)
          .then(res=>{
            if(res.affectedRows === 0){
              return resolve(false);
            }
            return resolve(res);
          }, e =>{
            console.log("[Delete] unable to delete");
            reject("Unable to delete data");
          });
    });
  }

  update(obj={}, id){
    return new Promise((resolve, reject) => {
      obj = obj || reject("Obj must be supplied");
      id = id || reject("Id must be supplied");

      let query = `UPDATE ${this.table} SET `;
      let updates = "";
      for(let item in obj){
        
        if(obj.hasOwnProperty(item)){
          if(this.mapToDb.hasOwnProperty(item)){
            updates += "`" + this.mapToDb[item] + "`=" + `"${obj[item]}", `;
          } else {
            updates += "`" + item + "`=" + `"${obj[item]}", `;
          }
        }
      }
      query += (updates.endsWith(', '))? updates.substr(0, updates.lastIndexOf(', ')) : updates;
      query += " WHERE `id`=?;";
      
      this.execute(query, id)
          .then(res=>{
            if(res.changedRows === 0){
              return resolve(false);
            } else {
              this.findById(id)
                  .then(data=>{
                    return resolve(data);
                  },(e)=>{
                    return reject('Unable to retrieve updated data');
                  });
            }
          },e=>{
            console.log(e);
            return reject("Unable to update data");
          });
    });
  }

  count(where=[]) {
    return new Promise((resolve, reject)=>{
      let query = `SELECT COUNT(*) AS total FROM ${this.table} `;
      where = this.whereClause(where);
      if(where.length > 0){
        query = query + where;
      }
      query += ';';
      
      this.execute(query,null)
        .then((result) => {
          return resolve(result[0]);
        }, (err) => {
          return reject(err);
        });
    });
  }
}

module.exports = CrudRepository;

// let crud = new CrudRepository('questions', {pictureDir: 'picture_dir', pwd: 'password', emailAddress:'email_address'});
// crud.findJoin({
//   subjects : [{column:'name', alias:'subjectName'}],
//   questions: [{column:'question'}]
// }, {
//   subjects: 'subject_id',
// }, [
//   {table: 'subjects', column: 'id', value: 1, operator: '=', nextOperator: 'AND'},
//   {table: 'questions', column: 'id', value: 3, operator: '='}
// ])
// .then((d)=>{console.log(d)}, e => {console.log(e)});
// console.log(crud.formatInsertQuery({sn:1, name:'jude'}, '').query);
// crud.insertMany([{userName: 'Okoro', password:'1234', email_address: 'gooodluck@gmail.com'}, {userName: 'Jamiko', password:'1234', email_address: 'jj@gmail.com'}])
//     .then(m=>console.log(m), (e)=>console.log(e));
//  crud.save({username:"bethel", pwd:'0000', emailAddress: 'bethels@gmail.com'})
//      .then((obj)=>{console.log(obj)}, (e)=>{console.log(e)});
// crud.findById(7)
//     .then(d=>{console.log(d)}, e=>{console.log(e)});
//  crud.deleteOne(7)
//      .then(d=>{console.log(d)}, e=>{console.log(e)});
// crud.update({username: "Soronos", pwd: 1099},7)
//     .then(res => {
//       console.log(res);
//     }, e => {
//       console.log(e);
//     });

// crud.findOne([{username: "bethel"}])
//   .then((d)=>{console.log(d)}, (e)=>{console.log(e)});