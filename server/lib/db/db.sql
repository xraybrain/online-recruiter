/* This file contains SQL for online_recruitment database */

DROP DATABASE IF EXISTS `online_recruitment`;

CREATE DATABASE `online_recruitment`;

-- Switch to online_recruitment db
USE `online_recruitment`;

USE `heroku_f7fdaa3f68a886a`;

SET @@auto_increment_increment=1;

-- Creates the admin table
CREATE TABLE `admins`(
  `id`            INT(11) NOT NULL AUTO_INCREMENT, 
  `userName`      VARCHAR(30) NOT NULL,
  `emailAddress`  VARCHAR(50) NOT NULL,
  `password`      VARCHAR(60) NOT NULL,
  `pictureDir`    VARCHAR(100),
  `userType`      INT(3) DEFAULT 0 COMMENT "0 for admin",
  `createdAt`     DATETIME, 
  `modifiedAt` TIMESTAMP,

  CONSTRAINT `admins_pk` PRIMARY KEY(`id`),
  CONSTRAINT `unique_admin_email` UNIQUE(`emailAddress`)
)ENGINE=InnoDB charset=utf8;

-- Creates the vacancy table
CREATE TABLE `vacancy`(
  `id` INT(11) NOT NULL AUTO_INCREMENT, 
  `name` VARCHAR(100) NOT NULL,
  `isAvailable` BOOLEAN DEFAULT FALSE, 
  `createdAt`   DATETIME, 
  `modifiedAt`  TIMESTAMP, 

  CONSTRAINT `vacancy_pk` PRIMARY KEY(`id`)
)ENGINE=InnoDB charset=utf8;

-- Creates the vacancy table
CREATE TABLE `vacancy_requirements`(
  `id` INT(11) NOT NULL AUTO_INCREMENT, 
  `vacancy_id` INT(11), 
  `requirement` VARCHAR(300), 
  `createdAt` DATETIME,
  `modifiedAt` TIMESTAMP,

  CONSTRAINT `vacancy_requirements_pk` PRIMARY KEY(`id`),
  CONSTRAINT `vacancy_requirements_vacancy_fk` FOREIGN KEY (`vacancy_id`) REFERENCES `vacancy`(`id`)
)ENGINE=InnoDB charset=utf8;

-- Creates the applicants table
CREATE TABLE `applicants` (
  `id`            INT(11) NOT NULL AUTO_INCREMENT, 
  `vacancy_id`    INT(11),
  `firstName`     VARCHAR(30), 
  `lastName`      VARCHAR(40), 
  `middleName`    VARCHAR(30),
  `dateOfBirth`   DATE,
  `emailAddress`  VARCHAR(50) NOT NULL, 
  `password`      VARCHAR(60) NOT NULL COMMENT "Encrypted using bcryptjs", 
  `phoneNo`       VARCHAR(14),
  `address`       VARCHAR(100),
  `pictureDir`   VARCHAR(100),
  `userType`      INT(3) DEFAULT 1 COMMENT "1 for applicant",
  `completedPersonal` BOOLEAN DEFAULT FALSE,
  `completedContact`  BOOLEAN DEFAULT FALSE,
  `completedEducation`BOOLEAN DEFAULT FALSE,
  `isSubmitted`       BOOLEAN DEFAULT FALSE,
  
  `createdAt`     DATETIME, 
  `modifiedAt`    TIMESTAMP,

  CONSTRAINT `applicants_pk` PRIMARY KEY(`id`),
  CONSTRAINT `unique_applicants_email` UNIQUE(`emailAddress`),
  CONSTRAINT `applicants_vacancy_fk` FOREIGN KEY(`vacancy_id`) REFERENCES `vacancy`(`id`)
)ENGINE=InnoDB charset=utf8;

-- Creates the applicant_certificates table
CREATE TABLE `applicant_certificates`(
  `id` INT(11) NOT NULL AUTO_INCREMENT, 
  `applicant_id` INT(11),
  `school`VARCHAR(100) NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `startDate` DATE NOT NULL,
  `endDate`   DATE NOT NULL, 
  `createdAt` DATETIME,
  `modifiedAt` TIMESTAMP, 

  CONSTRAINT `applicant_certificates_pk` PRIMARY KEY(`id`),
  CONSTRAINT `applicant_certificates_applicants_fk` FOREIGN KEY(`applicant_id`) REFERENCES `applicants`(`id`)
)ENGINE=InnoDB charset=utf8;

-- Creates the subjects table
CREATE TABLE `subjects`(
  `id`    INT(11) NOT NULL AUTO_INCREMENT, 
  `name`  VARCHAR(20) NOT NULL, 
  `score` INT(3) NOT NULL, 
  `maximumAnswer` INT(3) NOT NULL COMMENT "Total Answer Required",
  `examLimit`     INT(3) NOT NULL COMMENT "This is how long this subject exam will last in minutes",
  `createdAt` DATETIME,
  `modifiedAt` TIMESTAMP,

  CONSTRAINT `subjects_pk` PRIMARY KEY(`id`)
)ENGINE=InnoDB charset=utf8;


-- Creates the exam_questions table
CREATE TABLE `exam_questions`(
  `id`          INT(11) AUTO_INCREMENT, 
  `subject_id`  INT(11),
  `question`    VARCHAR(500) NOT NULL, 
  `answer`      CHAR(1) NOT NULL COMMENT "This stores the correct option i.e. (a, b, c, d)", 
  `optionA`     VARCHAR(300) NOT NULL, 
  `optionB`     VARCHAR(300) NOT NULL, 
  `optionC`     VARCHAR(300) NOT NULL, 
  `optionD`     VARCHAR(300) NOT NULL, 
  `createdAt`  DATETIME,
  `modifiedAt` TIMESTAMP,

  CONSTRAINT `exam_questions_pk` PRIMARY KEY(`id`),
  CONSTRAINT `exam_questions_subjects_fk` FOREIGN KEY(`subject_id`) REFERENCES `subjects`(`id`)
)ENGINE=InnoDB charset=utf8;

-- Creates the exam_session
CREATE TABLE `exam_session`(
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `applicant_id`     INT(11),
  `question_id`      INT(11),
  `subject_id`       INT(3),
  `selectedOption`   CHAR(1) COMMENT "The option Selected",
  `qNo`              INT(3)  NOT NULL,
  `createdAt`        DATETIME,
  `modifiedAt`       TIMESTAMP,

  CONSTRAINT `exam_session_pk` PRIMARY KEY(`id`),
  CONSTRAINT `exam_session_applicants_fk` FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`),
  CONSTRAINT `exam_session_exam_questions_fk` FOREIGN KEY (`question_id`) REFERENCES `exam_questions` (`id`)
)ENGINE=InnoDB charset=utf8;

-- Creates the recruitment_schedule table
CREATE TABLE `recruitment_schedule`(
  `id` INT(3) NOT NULL AUTO_INCREMENT,
  `startDate`  DATE NOT NULL,
  `endDate`    DATE NOT NULL,
  `createdAt`  DATETIME,
  `modifiedAt` TIMESTAMP,

  CONSTRAINT `recruitment_schedule_id` PRIMARY KEY (`id`)
)ENGINE=InnoDB charset=utf8;


CREATE TABLE `exam_results`(
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `applicant_id` INT(11),
  `subject_id` INT(11),
  `score`      INT(3),
  `createdAt` DATETIME, 
  `modifiedAt` TIMESTAMP,

  CONSTRAINT `exam_results_pk` PRIMARY KEY(`id`),
  CONSTRAINT `exam_results__applicants_fk` FOREIGN KEY(`applicant_id`) REFERENCES `applicants` (`id`),
  CONSTRAINT `exam_results__subjects_fk` FOREIGN KEY(`subject_id`) REFERENCES `subjects` (`id`)
)ENGINE=InnoDB charset=utf8;

-- Creates the active_exam table
CREATE TABLE `active_exams`(
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `subject_id`  INT(11),
  `applicant_id` INT(11),
  `createdAt`   DATETIME,
  `modifiedAt` TIMESTAMP,

  CONSTRAINT `active_exams_pk` PRIMARY KEY (`id`),
  CONSTRAINT `active_exams_subjects_fk` FOREIGN KEY(`subject_id`) REFERENCES 
  `subjects`(`id`),
  CONSTRAINT `active_exams_applicants_fk` FOREIGN KEY(`applicant_id`) REFERENCES 
  `applicants`(`id`)
 ) ENGINE=InnoDB charset=utf8;
 
 select * from admin;