const bcrypt = require('bcrypt');
const multer = require("multer");
require('dotenv').config()
const express = require('express');
const db = require('./models/db.js');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const app = express();
const cors = require('cors');
app.use(cors())
const jwt = require('jsonwebtoken')
const hostname = '127.0.0.1';
const port = 3000;
const secretKey = 'your-secret-key';
app.use(express.json()); //for add blog



  
  //start config for session
  app.use(session({
      secret: 'your-secret-key', // Secret key to sign the session ID cookie
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false } // Set secure to true if using HTTPS
    }));

    async function getAllService(req, res) {
        try {
          const result = await db.query('SELECT service_img, service_description, service_name FROM services');
          res.json(result.rows);
        } catch (err) {
          console.error(err);
          res.status(500).send('Internal Server Error');
        }
      }

      app.get('/Services', getAllService);



      app.get('/Getcategory/:id', async(req, res) => {
        try{
            const query = 'SELECT cat_description, service_name, cat_img, ammount_price from categories where categories.id = $1';
            const catId = req.params.id; // when use /:id should use req.params.id
            const result = await db.query(query, [catId]); 
            res.json(result.rows);
        }catch (error){
            console.error('Failed to get one category: ', error);
            res.status(500).json({ error: 'Failed to get one category'});
        }
    })



app.get('/Getdetails/:id', async(req, res) => {
        try{
            const query = 'SELECT categories.service_id, categories.detail_description, cat_img FROM categories WHERE categories.id = $1';
            const catId = req.params.id; // when use /:id should use req.params.id
            const result = await db.query(query, [catId]); 
            res.json(result.rows);
        }catch (error){
            console.error('Failed to get one category: ', error);
            res.status(500).json({ error: 'Failed to get one category'});
        };
    });



    app.post('/Registration', async(req, res) => {
        const {username, email, password} = req.body;
        try{


        // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the saltRounds  
            const query = `INSERT INTO users (username, email, password)
                                VALUES ($1, $2, $3)
                                RETURNING "id";`
            const values = [username, email, hashedPassword];
            const result = await db.query(query, values);
            const newUserId = result.rows[0];
            // Send a success response with the newly created blog_id
            res.status(201).json({ message: 'User added successfully', id: newUserId });
        } catch (error){
            console.error('Failed to register : ', error);
            res.status(500).json({ error: 'Failed to register'});
        };
    });



    app.post('/Login', async (req, res) => {
        const { email, password } = req.body;
      
        try {
          // Validate the email and password inputs
          if (!email || !password) {
            throw new Error('Email and password are required');
          }
      
          // Check if the user exists in the database
          const query = 'SELECT * FROM users WHERE email = $1';
          const values = [email];
          const result = await db.query(query, values);

      
          if (result.rows.length === 0) {
            throw new Error('User does not exist');
          }else{
            req.session.userID = result.rows[0];
            console.log(req.session.userID)
          }

        
      
          const hashedPassword = result.rows[0].password;
  
      // Compare the hashed password from the database with the provided password
      const passwordMatch = await bcrypt.compare(password, hashedPassword);
      
          if (!passwordMatch) {
            throw new Error('Incorrect password');
          }
      
          // If user credentials are valid, create a JWT token
          const user = {
            id: result.rows[0].id,
            email: result.rows[0].email,
            // Add other user information you want to include in the token
          };
      
          const token = jwt.sign(user, secretKey, { expiresIn: '1h' }); // Token expires in 1 hour
          const successMsg = 'User logged successfully'
      
          res.json({successMsg, result, token }); // Send the token to the client

        } catch (error) {
          res.status(401).json({ error: error.message });
        }
      });
      
      
      
    app.get('/logout', (req, res) => {
        if(isset(req.session.userID)){
            console.log("session destroyed")
        
        // Destroy the user's session
            req.session.destroy((err) => {
            if (err) {
              console.error('Error destroying session:', err);
              res.status(500).json({ error: 'Failed to logout' });
            } else {
              // Redirect the user to the home page or any other desired page after logout
              res.redirect('/Services');
            }
            });
             }
            else {
                console.log("no session to destroy");
                res.redirect('/Services');
                }
      });
    
      function isset(sessionVariable) {
        return sessionVariable !== undefined && sessionVariable !== null && sessionVariable !== false;
      }

      app.get('/dashboard', async(req, res) => {
        const token = req.header('Authorization');
      
        if (!token) {
          return res.status(401).json({ error: 'Access denied' });
        }
      
        try {
          const decoded = jwt.verify(token, secretKey);
          req.user = decoded; // Store the decoded user information in the request object
          // Proceed to your protected route logic using req.user
          res.json({ message: 'Welcome to the dashboard!', user: req.user });
        } catch (error) {
          res.status(401).json({ error: 'Invalid token' });
        }
      });

      app.post('/LoginDahboard', async (req, res) => {
        const { email, password } = req.body;
      
        try {
          // Validate the email and password inputs
          if (!email || !password) {
            throw new Error('Email and password are required');
          }
      
          // Check if the user exists in the database
          const query = 'SELECT * FROM users WHERE email = $1 And rule = 2';
          const values = [email];
          const result = await db.query(query, values);

      
          if (result.rows.length === 0) {
            throw new Error('Access denied, Admin does not exist');
          }else if (password != result.rows[0].password ){
            throw new Error('Incorrect password');
          }else{
            req.session.AdminID = result.rows[0];
            console.log(req.session.AdminID)}
          

      
          // If user credentials are valid, create a JWT token
          const user = {
            id: result.rows[0].id,
            email: result.rows[0].email,
            // Add other user information you want to include in the token
          };
      
          const token = jwt.sign(user, secretKey, { expiresIn: '1h' }); // Token expires in 1 hour
          const successMsg = 'Admin logged successfully'
      
          res.json({successMsg, result, token }); // Send the token to the client

        } catch (error) {
          res.status(401).json({ error: error.message });
        }
      });


app.listen(3000, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
  });