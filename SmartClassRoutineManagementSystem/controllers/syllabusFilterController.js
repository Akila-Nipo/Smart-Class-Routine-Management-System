/**
 * @module fetchCourseData
 * @description This module provides a function to fetch course 
 *              data from the database based on department, session, 
 *              exam year, and course title.
 */

const pool = require('../config/db');

/**
 * Fetches course data for the specified department, session, exam year
 * and course title.
 *
 * @param {string} departmentName - The name of the department.
 * @param {string} sessionName - The name of the session (e.g., '2019-2020').
 * @param {string} examYear - The exam year (e.g., '2020').
 * @param {string} courseName - The title of the course (e.g., 'Software Engineering').
 * @param {function(Error, Object)} callback - A callback function that handles the result. 
 * Receives two arguments: an error (if any) and the course data (if found).
 *
 * @returns {void} This function does not return a value directly. 
 *                  The result is provided via the callback.
 */
const fetchCourseData = (departmentName, sessionName, examYear, courseName, callback) => {
    
    /** 
     * @constant {string} queryDept - SQL query to select department ID based on department name.
     */
    const queryDept = 'SELECT dept_id FROM department WHERE Dept_Name = ?;';
    
    /** 
     * @constant {string} querySession - SQL query to select session ID based on department ID and session name.
     */
    const querySession = 'SELECT session_id FROM session WHERE dept_id = ? AND Session_name = ?;';
    
    /** 
     * @constant {string} queryExamYear - SQL query to select exam year ID based on session ID and exam year.
     */
    const queryExamYear = 'SELECT exam_year_id FROM examyear WHERE session_id = ? AND Exam_year = ?;';
    
    /** 
     * @constant {string} queryCourse - SQL query to select course data based on exam year ID and course title.
     */
    const queryCourse = `
        SELECT 
            c.course_id, 
            c.Course_code, 
            c.Course_code, 
            c.course_title, 
            c.course_type, 
            c.contact_hour, 
            c.rationale
        FROM course c
        WHERE c.exam_year_id = ? AND c.course_title = ?;
    `;

    // Query to get the department ID
    pool.query(queryDept, [departmentName], (err, deptResults) => {
        if (err) {
            return callback(err, null);
        }
        if (deptResults.length === 0) {
            return callback(new Error('Department not found'), null);
        }

        const deptId = deptResults[0].dept_id;

        // Query to get the session ID
        pool.query(querySession, [deptId, sessionName], (err, sessionResults) => {
            if (err) {
                return callback(err, null);
            }
            if (sessionResults.length === 0) {
                return callback(new Error('Session not found'), null);
            }

            const sessionId = sessionResults[0].session_id;

            // Query to get the exam year ID
            pool.query(queryExamYear, [sessionId, examYear], (err, examYearResults) => {
                if (err) {
                    return callback(err, null);
                }
                if (examYearResults.length === 0) {
                    return callback(new Error('Exam year not found'), null);
                }

                const examYearId = examYearResults[0].exam_year_id;

                // Query to get the course data
                pool.query(queryCourse, [examYearId, courseName], (err, courseResults) => {
                    if (err) {
                        return callback(err, null);
                    }
                    if (courseResults.length === 0) {
                        return callback(null, {}); // No course found
                    }

                    const courseData = courseResults[0];
                    const courseId = courseData.course_id;

                    // Initialize arrays for additional data
                    courseData.chapters = [];
                    courseData.objectives = [];
                    courseData.prerequisites = [];
                    courseData.recommended_books = [];
                    courseData.student_learning_outcomes = [];

                    // Create an array of queries for additional data
                    const queries = [];

                    /**
                     * Fetch chapters related to the course
                     * @constant {Promise}
                     */
                    queries.push(new Promise((resolve, reject) => {
                        pool.query('SELECT Chapter FROM coursechapter WHERE course_id = ?;', [courseId], (err, results) => {
                            if (err) return reject(err);
                            courseData.chapters = results.map(row => row.Chapter);
                            resolve();
                        });
                    }));

                    /**
                     * Fetch course objectives
                     * @constant {Promise}
                     */
                    queries.push(new Promise((resolve, reject) => {
                        pool.query('SELECT Objective FROM courseobjective WHERE course_id = ?;', [courseId], (err, results) => {
                            if (err) return reject(err);
                            courseData.objectives = results.map(row => row.Objective);
                            resolve();
                        });
                    }));

                    /**
                     * Fetch course prerequisites
                     * @constant {Promise}
                     */
                    queries.push(new Promise((resolve, reject) => {
                        pool.query('SELECT Prerequisite FROM prerequisitecourse WHERE course_id = ?;', [courseId], (err, results) => {
                            if (err) return reject(err);
                            courseData.prerequisites = results.map(row => row.Prerequisite);
                            resolve();
                        });
                    }));

                    /**
                     * Fetch recommended books for the course
                     * @constant {Promise}
                     */
                    queries.push(new Promise((resolve, reject) => {
                        pool.query(`
                            SELECT 
                                Book_title, 
                                Writer, 
                                Edition, 
                                Publisher, 
                                Publish_year 
                            FROM recommendedbook 
                            WHERE course_id = ?;
                        `, [courseId], (err, results) => {
                            if (err) return reject(err);
                            courseData.recommended_books = results;
                            resolve();
                        });
                    }));

                    /**
                     * Fetch student learning outcomes
                     * @constant {Promise}
                     */
                    queries.push(new Promise((resolve, reject) => {
                        pool.query('SELECT Outcome FROM studentlearningoutcome WHERE course_id = ?;', [courseId], (err, results) => {
                            if (err) return reject(err);
                            courseData.student_learning_outcomes = results.map(row => row.Outcome);
                            resolve();
                        });
                    }));

                    // Execute all queries in parallel
                    Promise.all(queries)
                        .then(() => callback(null, courseData))
                        .catch(err => callback(err, null));
                });
            });
        });
    });
};

module.exports = { fetchCourseData };
