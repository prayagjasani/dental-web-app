const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set("view engine", "ejs");

// Database connection configuration
let db;
let dbType;

// Check if running on Render (using PostgreSQL)
if (process.env.DATABASE_URL) {
    dbType = 'pg';
    const { Pool } = require('pg');
    db = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    console.log('Using PostgreSQL database on Render');
} else {
    // Local development using MySQL
    dbType = 'mysql';
    const mysql = require('mysql2/promise');
    db = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'Prayag@2oo4.',
        database: 'mydatabase',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    console.log('Using local MySQL database');
}

// Initialize database
const initializeDb = async() => {
    try {
        let createTableQuery;

        if (dbType === 'pg') {
            // PostgreSQL query
            createTableQuery = `
            CREATE TABLE IF NOT EXISTS patients (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                contact_number VARCHAR(15),
                medical_history TEXT,
                treatment_notes TEXT,
                last_visit_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`;
        } else {
            // MySQL query
            createTableQuery = `
            CREATE TABLE IF NOT EXISTS patients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                contact_number VARCHAR(15),
                medical_history TEXT,
                treatment_notes TEXT,
                last_visit_date DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`;
        }

        if (dbType === 'pg') {
            await db.query(createTableQuery);
        } else {
            await db.query(createTableQuery);
        }

        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

// Initialize the database when the app starts
initializeDb();

// Helper function to execute database queries
async function executeQuery(query, params = []) {
    try {
        if (dbType === 'pg') {
            const result = await db.query(query, params);
            return result.rows;
        } else {
            const [rows] = await db.query(query, params);
            return rows;
        }
    } catch (err) {
        console.error('Database query error:', err);
        throw err;
    }
}

// Home page with all patients
app.get("/", async(req, res) => {
    try {
        let query;

        if (dbType === 'pg') {
            query = `
                SELECT *, 
                to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_created_date,
                to_char(last_visit_date, 'YYYY-MM-DD HH24:MI') as formatted_last_visit_date 
                FROM patients 
                ORDER BY last_name ASC`;
        } else {
            query = `
                SELECT *, 
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_date,
                DATE_FORMAT(last_visit_date, '%Y-%m-%d %H:%i') as formatted_last_visit_date 
                FROM patients 
                ORDER BY last_name ASC`;
        }

        const patients = await executeQuery(query);
        res.render("index", { patients });
    } catch (err) {
        console.error('Error fetching patients:', err);
        res.status(500).send('Error fetching patients: ' + err.message);
    }
});

// Insert patient data
app.post("/add", async(req, res) => {
    try {
        const { first_name, last_name, contact_number, medical_history, treatment_notes } = req.body;

        // Use current date and time for last visit
        const now = new Date();

        let query;
        let params;

        if (dbType === 'pg') {
            query = "INSERT INTO patients (first_name, last_name, contact_number, medical_history, treatment_notes, last_visit_date) VALUES ($1, $2, $3, $4, $5, $6)";
            params = [first_name, last_name, contact_number, medical_history, treatment_notes, now];
        } else {
            query = "INSERT INTO patients (first_name, last_name, contact_number, medical_history, treatment_notes, last_visit_date) VALUES (?, ?, ?, ?, ?, ?)";
            params = [first_name, last_name, contact_number, medical_history, treatment_notes, now];
        }

        await executeQuery(query, params);
        res.redirect("/");
    } catch (err) {
        console.error('Error adding patient:', err);
        res.status(500).send('Error adding patient: ' + err.message);
    }
});

// Delete patient
app.post("/delete/:id", async(req, res) => {
    try {
        const patientId = req.params.id;

        let query;

        if (dbType === 'pg') {
            query = "DELETE FROM patients WHERE id = $1";
        } else {
            query = "DELETE FROM patients WHERE id = ?";
        }

        await executeQuery(query, [patientId]);
        res.redirect("/");
    } catch (err) {
        console.error('Error deleting patient:', err);
        res.status(500).send('Error deleting patient: ' + err.message);
    }
});

// Search patient data
app.get("/search", (req, res) => {
    res.render("search");
});

app.post("/search", async(req, res) => {
    try {
        const { search_term, visit_date } = req.body;
        let query;
        let params = [];
        let paramIndex = 1;

        if (dbType === 'pg') {
            query = `
                SELECT *, 
                to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_created_date,
                to_char(last_visit_date, 'YYYY-MM-DD HH24:MI') as formatted_last_visit_date 
                FROM patients WHERE 1=1`;

            if (search_term && search_term.trim() !== '') {
                query += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex+1} OR contact_number ILIKE $${paramIndex+2})`;
                params.push(`%${search_term}%`);
                params.push(`%${search_term}%`);
                params.push(`%${search_term}%`);
                paramIndex += 3;
            }

            if (visit_date) {
                query += ` AND DATE(last_visit_date) = $${paramIndex}`;
                params.push(visit_date);
            }
        } else {
            query = `
                SELECT *, 
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_date,
                DATE_FORMAT(last_visit_date, '%Y-%m-%d %H:%i') as formatted_last_visit_date 
                FROM patients WHERE 1=1`;

            if (search_term && search_term.trim() !== '') {
                query += ` AND (first_name LIKE ? OR last_name LIKE ? OR contact_number LIKE ?)`;
                params.push(`%${search_term}%`);
                params.push(`%${search_term}%`);
                params.push(`%${search_term}%`);
            }

            if (visit_date) {
                query += ` AND DATE(last_visit_date) = ?`;
                params.push(visit_date);
            }
        }

        query += " ORDER BY last_name ASC";

        const patients = await executeQuery(query, params);
        res.render("results", { patients });
    } catch (err) {
        console.error('Error searching patients:', err);
        res.status(500).send('Error searching patients: ' + err.message);
    }
});

// View all patient records
app.get("/records", async(req, res) => {
    try {
        let query;

        if (dbType === 'pg') {
            query = `
                SELECT *, 
                to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_created_date,
                to_char(last_visit_date, 'YYYY-MM-DD HH24:MI') as formatted_last_visit_date 
                FROM patients 
                ORDER BY last_name ASC`;
        } else {
            query = `
                SELECT *, 
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_date,
                DATE_FORMAT(last_visit_date, '%Y-%m-%d %H:%i') as formatted_last_visit_date 
                FROM patients 
                ORDER BY last_name ASC`;
        }

        const patients = await executeQuery(query);
        res.render("records", { patients });
    } catch (err) {
        console.error('Error fetching patients:', err);
        res.status(500).send('Error fetching patients: ' + err.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});