//signup and login API endpoints
const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET =process.env.JWT_SECRET || "supersecret";

// SignUp
router.post('/signup', async(req, res) =>{
    const {name, email, password} = req.body;
    try{
        const hashed = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
            [name, email, hashed]
        );
        res.json({ user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }

});

//login
router.post('/login', async(req, res) =>{
    const {email, password} = req.body;
    try{
        const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
        if(result.rows.length === 0) return res.status(400).json({ error: 'user not found' });
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);
        if(!match) return res.status(400).json({ error: 'invalid password' });
        const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '1h' });
    res.json({ token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;