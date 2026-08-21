require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

// Connection pool — reused across requests rather than opening a new
// connection every time.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// Quick test route — confirms the server is running AND can reach the database.
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ server: 'running', database: rows[0].ok === 1 ? 'connected' : 'unknown' });
  } catch (err) {
    res.status(500).json({ server: 'running', database: 'error', message: err.message });
  }
});

// Receives a quote request from the website form and saves it to the database.
app.post('/api/quote-requests', async (req, res) => {
  const {
    fullName,
    phone,
    email,
    postcode,
    serviceType,
    propertyType,
    preferredDate,
    frequency,
    additionalInfo,
  } = req.body;

  // Basic server-side validation — the required fields must actually be present.
  if (!fullName || !phone || !email || !postcode || !serviceType || !propertyType) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }

  try {
    await pool.query(
      `INSERT INTO quote_requests
        (full_name, phone, email, postcode, service_type, property_type, preferred_date, frequency, additional_info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName,
        phone,
        email,
        postcode,
        serviceType,
        propertyType,
        preferredDate || null,
        frequency || null,
        additionalInfo || null,
      ]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Could not save your request. Please try again.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Bright & Beautiful API running at http://localhost:${PORT}`);
});