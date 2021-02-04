class ActiveExam {
  constructor(sid, cid){
    this.subjectId = sid;
    this.candidateId = cid;
  }

  getSubjectId(){
    return this.subjectId
  }
  setSubjectId(sid){
    this.subjectId = sid;
  }

  getCandidateId(){
    return this.subjectId;
  }
  setCandidateId(cid){
    this.candidateId = cid;
  }
}

module.exports = ActiveExam;