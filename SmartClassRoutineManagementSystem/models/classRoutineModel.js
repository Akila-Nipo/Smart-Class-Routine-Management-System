const db = require('../config/db');

// Function to create the classRoutine table
const createclassRoutineTable = () => {
    const query = `
        CREATE TABLE IF NOT EXISTS classRoutine (
        
            id INT AUTO_INCREMENT PRIMARY KEY,
            Dept_id INT,  -- Added dept_id column
            Teacher_id INT, -- Added Teacher_id column
            Day VARCHAR(50) NOT NULL,
            Year VARCHAR(10) NOT NULL,
            Time VARCHAR(50) NOT NULL,
            Course VARCHAR(255) NOT NULL,
            Room VARCHAR(255) NOT NULL,  
            FOREIGN KEY (Dept_id) REFERENCES department(dept_id),
            FOREIGN KEY (Teacher_id) REFERENCES teacher(teacher_id)
        );
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error creating table:', err);
            throw err;
        }
        console.log('classRoutine table created or already exists');
    });
};




module.exports = {
    createclassRoutineTable
};
