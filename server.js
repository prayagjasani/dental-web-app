const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set("view engine", "ejs");

// Debugging environment variables
console.log('Environment variables:');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('RENDER exists:', !!process.env.RENDER);
console.log('NODE_ENV:', process.env.NODE_ENV);

// In-memory data store for demo purposes when no database is available
const inMemoryPatients = [];
let nextPatientId = 1;

// Database connection configuration
let db;
let dbType;

// Check if running on Render with PostgreSQL database
if (process.env.DATABASE_URL) {
    // We're on Render with a database - use PostgreSQL
    dbType = 'pg';
    const { Pool } = require('pg');
    db = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    console.log('Using PostgreSQL database with DATABASE_URL');
} else if (process.env.RENDER) {
    // We're on Render but no database is configured - use in-memory storage
    dbType = 'memory';
    console.log('Running on Render without a database - using in-memory storage for demo purposes');
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
        if (dbType === 'pg') {
            // PostgreSQL query
            const createTableQuery = `
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
            await db.query(createTableQuery);
            console.log('PostgreSQL database initialized successfully');
        } else if (dbType === 'mysql') {
            // MySQL query
            const createTableQuery = `
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
            await db.query(createTableQuery);
            console.log('MySQL database initialized successfully');
        } else if (dbType === 'memory') {
            // Nothing to initialize for in-memory storage
            console.log('In-memory storage ready');
        }
    } catch (err) {
        console.error('Error initializing database:', err);
        console.error('Database type:', dbType);
        console.error('Environment variable DATABASE_URL exists:', !!process.env.DATABASE_URL);
        console.error('Environment variable RENDER exists:', !!process.env.RENDER);
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
        } else if (dbType === 'mysql') {
            const [rows] = await db.query(query, params);
            return rows;
        } else if (dbType === 'memory') {
            // Handle in-memory operations based on the query type
            if (query.includes('SELECT') && query.includes('FROM patients')) {
                return inMemoryPatients.map(patient => ({
                    ...patient,
                    formatted_created_date: new Date(patient.created_at).toISOString().replace('T', ' ').substring(0, 19),
                    formatted_last_visit_date: patient.last_visit_date ? new Date(patient.last_visit_date).toISOString().replace('T', ' ').substring(0, 16) : null
                }));
            } else if (query.includes('INSERT INTO patients')) {
                const now = new Date();
                const newPatient = {
                    id: nextPatientId++,
                    first_name: params[0],
                    last_name: params[1],
                    contact_number: params[2],
                    medical_history: params[3],
                    treatment_notes: params[4],
                    last_visit_date: params[5],
                    created_at: now
                };
                inMemoryPatients.push(newPatient);
                return [];
            } else if (query.includes('DELETE FROM patients')) {
                const idToDelete = params[0];
                const index = inMemoryPatients.findIndex(p => p.id === Number(idToDelete));
                if (index !== -1) {
                    inMemoryPatients.splice(index, 1);
                }
                return [];
            }
            return [];
        }
    } catch (err) {
        console.error('Database query error:', err);
        console.error('Database type:', dbType);
        throw err;
    }
}

// Home page with all patients
app.get("/", async(req, res) => {
    try {
        let patients;

        if (dbType === 'pg') {
            const query = `
                SELECT *, 
                to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_created_date,
                to_char(last_visit_date, 'YYYY-MM-DD HH24:MI') as formatted_last_visit_date 
                FROM patients 
                ORDER BY last_name ASC`;
            patients = await executeQuery(query);
        } else if (dbType === 'mysql') {
            const query = `
                SELECT *, 
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_date,
                DATE_FORMAT(last_visit_date, '%Y-%m-%d %H:%i') as formatted_last_visit_date 
                FROM patients 
                ORDER BY last_name ASC`;
            patients = await executeQuery(query);
        } else if (dbType === 'memory') {
            // For in-memory, just return all patients sorted by last_name
            patients = await executeQuery('SELECT * FROM patients');
            patients.sort((a, b) => a.last_name.localeCompare(b.last_name));
        }

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
        } else if (dbType === 'mysql') {
            query = "INSERT INTO patients (first_name, last_name, contact_number, medical_history, treatment_notes, last_visit_date) VALUES (?, ?, ?, ?, ?, ?)";
            params = [first_name, last_name, contact_number, medical_history, treatment_notes, now];
        } else if (dbType === 'memory') {
            query = "INSERT INTO patients";
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
        } else if (dbType === 'mysql') {
            query = "DELETE FROM patients WHERE id = ?";
        } else if (dbType === 'memory') {
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
        let patients = [];

        if (dbType === 'pg') {
            let query = `
                SELECT *, 
                to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_created_date,
                to_char(last_visit_date, 'YYYY-MM-DD HH24:MI') as formatted_last_visit_date 
                FROM patients WHERE 1=1`;
            let params = [];
            let paramIndex = 1;

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

            query += " ORDER BY last_name ASC";
            patients = await executeQuery(query, params);
        } else if (dbType === 'mysql') {
            let query = `
                SELECT *, 
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_date,
                DATE_FORMAT(last_visit_date, '%Y-%m-%d %H:%i') as formatted_last_visit_date 
                FROM patients WHERE 1=1`;
            let params = [];

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

            query += " ORDER BY last_name ASC";
            patients = await executeQuery(query, params);
        } else if (dbType === 'memory') {
            // Get all patients
            patients = await executeQuery('SELECT * FROM patients');

            // Filter based on search criteria
            if (search_term && search_term.trim() !== '') {
                const term = search_term.toLowerCase();
                patients = patients.filter(p =>
                    p.first_name.toLowerCase().includes(term) ||
                    p.last_name.toLowerCase().includes(term) ||
                    (p.contact_number && p.contact_number.includes(term))
                );
            }

            if (visit_date) {
                const searchDate = new Date(visit_date).toDateString();
                patients = patients.filter(p =>
                    p.last_visit_date && new Date(p.last_visit_date).toDateString() === searchDate
                );
            }

            // Sort by last name
            patients.sort((a, b) => a.last_name.localeCompare(b.last_name));
        }

        res.render("results", { patients });
    } catch (err) {
        console.error('Error searching patients:', err);
        res.status(500).send('Error searching patients: ' + err.message);
    }
});

// View all patient records
app.get("/records", async(req, res) => {
    try {
        let patients;

        if (dbType === 'pg') {
            const query = `
                SELECT *, 
                to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_created_date,
                to_char(last_visit_date, 'YYYY-MM-DD HH24:MI') as formatted_last_visit_date 
                FROM patients 
                ORDER BY last_name ASC`;
            patients = await executeQuery(query);
        } else if (dbType === 'mysql') {
            const query = `
                SELECT *, 
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_date,
                DATE_FORMAT(last_visit_date, '%Y-%m-%d %H:%i') as formatted_last_visit_date 
                FROM patients 
                ORDER BY last_name ASC`;
            patients = await executeQuery(query);
        } else if (dbType === 'memory') {
            // For in-memory, just return all patients sorted by last_name
            patients = await executeQuery('SELECT * FROM patients');
            patients.sort((a, b) => a.last_name.localeCompare(b.last_name));
        }

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