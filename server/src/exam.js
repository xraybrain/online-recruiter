//-- repositories
const questionRepository = require("../lib/repository/QuestionRepos");
const subjectRepository = require("../lib/repository/SubjectRepos");
const examSessionRepository = require("../lib/repository/ExamSessionRepos");
const examResultRepository = require("../lib/repository/ExamResultRepos");
const activeExamRepository = require("../lib/repository/ActiveExamRepos");

const {
  formatActiveExam,
  search,
  toSQLDateTime
} = require("../lib/helpers/formatter");

async function refreshDB(applicantID) {
  //-- clean activeExam table if this applicant has data in it
  let result1 = await activeExamRepository.deleteOne(applicantID, {
    id: "applicant_id"
  });
  //-- clean exam session if this user already has a data in it
  let result2 = await examSessionRepository.deleteOne(applicantID, {
    id: "applicant_id"
  });

  return;
}

async function initExam(applicantID) {
  //-- get total Subjects to be taken
  let subjects = await subjectRepository.findMany([]);
  //-- if subjects is greater than 1 continue
  if (subjects === false) return false;

  await refreshDB(applicantID);

  //-- insert exam subjects to active exam
  let newActiveExam = formatActiveExam(subjects, applicantID);
  let activeExam = await activeExamRepository.insertMany(newActiveExam);

  //-- get the first subject to be taken
  let subject = subjects[0];
  //-- destructure this subject to get the data
  let { id, name, score, maximumAnswer, examLimit } = subject;

  //-- retrieve this subject exam questions
  let questions = await questionRepository.findMany([{ subject_id: id }]);
  //-- if this is false return
  if (questions === false) return false;

  //-- generate random questions for this current user
  let randomQuestions = await generateRandom(questions, maximumAnswer);

  return {
    randomQuestions,
    sid: id,
    examLimit,
    examTime: timeConverter(examLimit)
  };
}

//-- randomise question
async function generateRandom(questions = [], limit) {
  let randomQuestions = [];
  if (Array.isArray(questions) === false) return false;

  let i = 1;
  let questionSize = questions.length;
  let index;

  //-- loop
  while (i < limit) {
    //-- generate a random number
    index = await Math.floor(Math.random() * questionSize);
    // the question number
    // questions[index].qNo = i;

    randomQuestions.push(questions[index]);
    ++i;
  }

  return randomQuestions;
}

//-- check if user has already answered this question
async function inExamSession(questionID, applicantID, qNo) {
  let examSession = await examSessionRepository.findOne(
    [{ question_id: questionID }, { applicant_id: applicantID }, { qNo }],
    "=",
    "AND"
  );
  return examSession;
}

function setCheckedOption(examSession = {}, question = {}) {
  if (examSession === false) return false;
  question.selectedOption = examSession.selectedOption;
  return question;
}

function timeConverter(timeInMin) {
  let time = {
    hour: 0,
    minutes: 0,
    seconds: 0
  };

  while (timeInMin !== 0) {
    if (timeInMin >= 60) {
      time.hour += 1;
      timeInMin -= 60;
    } else {
      time.minutes = timeInMin;
      timeInMin = 0;
    }
  }

  return time;
}

async function submitExam(applicantID, subjectID) {
  //-- get this applicant examSession
  let examSessions = await examSessionRepository.findMany(
    [{ applicant_id: applicantID }, { subject_id: subjectID }],
    "=",
    "AND"
  );
  //-- get this subject exam question
  let examQuestion = await questionRepository.findMany(
    [{ subject_id: subjectID }],
    "="
  );
  //-- retrieve this subject
  let subject = await subjectRepository.findById(subjectID);

  let examScore = 0;

  // console.log(examSessions);

  if (examSessions !== false) {
    for (let examSession of examSessions) {
      let question = search(examQuestion, examSession.question_id, "id");

      if (question !== false) {
        //-- marking this exam
        if (question.answer === examSession.selectedOption) {
          console.log("marking");
          examScore += subject.score;
        }
      }
    }
  }

  //-- delete this subject from activeExam
  let status = await activeExamRepository.deleteOne(applicantID, {
    id: "applicant_id"
  });
  //-- insert this examResult
  let examResult = await examResultRepository.insert({
    applicant_id: applicantID,
    subject_id: subjectID,
    score: examScore,
    createdAt: toSQLDateTime(new Date())
  });

  let examData = await loadNextQuestion(applicantID);

  return examData;
}

async function examSummary(applicantID) {
  let examResults = await examResultRepository.findJoin(
    {
      subjects: [{ column: "name", alias: "subjectName" }],
      exam_results: [{ column: "score" }]
    },
    {
      subjects: "subject_id"
    },
    [
      {
        table: "exam_results",
        column: "applicant_id",
        value: applicantID,
        operator: "="
      }
    ]
  );

  //console.log(examResults);

  let summary = {
    examResults,
    totalScore: 0
  };

  for (let result of examResults) {
    summary.totalScore += result.score;
  }

  return summary;
}

async function loadNextQuestion(applicantID) {
  //-- check if more subject exists
  let activeExam = await activeExamRepository.findOne(
    [{ applicant_id: applicantID }],
    "="
  );

  //-- no other subject
  if (activeExam === false) return false;

  //-- retieve the next subject
  let subject = await subjectRepository.findById(activeExam.subject_id);
  let { id, examLimit, maximumAnswer } = subject;
  //-- retieve this subject question
  let questions = await questionRepository.findMany([{ subject_id: id }]);

  //-- if this is false return
  if (questions === false) return false;

  //-- generate random questions for this current user
  let randomQuestions = await generateRandom(questions, maximumAnswer);

  return {
    randomQuestions,
    sid: id,
    examTime: timeConverter(examLimit)
  };
}
//generateRandom(["john", "mary", "cornel", "comfort"], 5);

module.exports = {
  initExam,
  inExamSession,
  setCheckedOption,
  timeConverter,
  submitExam,
  examSummary
};
