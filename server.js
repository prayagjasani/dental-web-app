const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set("view engine", "ejs");

// Database connection using environment variables
let db;
if (process.env.DATABASE_URL) {
    // Use connection string from Render
    db = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
} else {
    // Use local database for development
    db = new Pool({
        host: "localhost",
        user: "root",
        password: "Prayag@2oo4.",
        database: "mydatabase"
    });
}

// Initialize database
const initializeDb = async() => {
    try {
        // Create patients table if not exists
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
        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

// Initialize the database when the app starts
initializeDb();

// Home page with all patients
app.get("/", async(req, res) => {
    try {
        const query = `
            SELECT *, 
            to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_created_date,
            to_char(last_visit_date, 'YYYY-MM-DD HH24:MI') as formatted_last_visit_date 
            FROM patients 
            ORDER BY last_name ASC`;

        const result = await db.query(query);
        res.render("index", { patients: result.rows });
    } catch (err) {
        console.error('Error fetching patients:', err);
        res.status(500).send('Error fetching patients');
    }
});

// Insert patient data
app.post("/add", async(req, res) => {
    try {
        const { first_name, last_name, contact_number, medical_history, treatment_notes } = req.body;

        // Use current date and time for last visit
        const now = new Date();

        const query = "INSERT INTO patients (first_name, last_name, contact_number, medical_history, treatment_notes, last_visit_date) VALUES ($1, $2, $3, $4, $5, $6)";

        await db.query(query, [first_name, last_name, contact_number, medical_history, treatment_notes, now]);
        res.redirect("/");
    } catch (err) {
        console.error('Error adding patient:', err);
        res.status(500).send('Error adding patient');
    }
});

// Delete patient
app.post("/delete/:id", async(req, res) => {
    try {
        const patientId = req.params.id;
        const query = "DELETE FROM patients WHERE id = $1";

        await db.query(query, [patientId]);
        res.redirect("/");
    } catch (err) {
        console.error('Error deleting patient:', err);
        res.status(500).send('Error deleting patient');
    }
});

// Search patient data
app.get("/search", (req, res) => {
    res.render("search");
});

app.post("/search", async(req, res) => {
    try {
        const { search_term, visit_date } = req.body;
        let query = `
            SELECT *, 
            to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_created_date,
            to_char(last_visit_date, 'YYYY-MM-DD HH24:MI') as formatted_last_visit_date 
            FROM patients WHERE 1=1`;
        const params = [];

        if (search_term && search_term.trim() !== '') {
            query += " AND (first_name ILIKE $1 OR last_name ILIKE $2 OR contact_number ILIKE $3)";
            params.push(`%${search_term}%`);
            params.push(`%${search_term}%`);
            params.push(`%${search_term}%`);
        }

        if (visit_date) {
            const paramIndex = params.length + 1;
            query += ` AND DATE(last_visit_date) = $${paramIndex}`;
            params.push(visit_date);
        }

        query += " ORDER BY last_name ASC";

        const result = await db.query(query, params);
        res.render("results", { patients: result.rows });
    } catch (err) {
        console.error('Error searching patients:', err);
        res.status(500).send('Error searching patients');
    }
});

// View all patient records
app.get("/records", async(req, res) => {
    try {
        const query = `
            SELECT *, 
            to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_created_date,
            to_char(last_visit_date, 'YYYY-MM-DD HH24:MI') as formatted_last_visit_date 
            FROM patients 
            ORDER BY last_name ASC`;

        const result = await db.query(query);
        res.render("records", { patients: result.rows });
    } catch (err) {
        console.error('Error fetching patients:', err);
        res.status(500).send('Error fetching patients');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});