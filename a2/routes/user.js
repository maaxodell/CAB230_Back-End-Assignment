var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// add a new user into the database
router.post("/register", (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        res.status(400)
        .json({"error" : true, "message" : "Request body incomplete - email and password needed"});
        return
    }

    req.db
    .from("users")
    .select('*')
    .where("email", "=", email)
    .then((users) => {
        if (users.length > 0) {
            throw {Status: 409, Message: "User already exists!"};
        } else {
            const saltRounds = 10;
            const hash = bcrypt.hashSync(password, saltRounds);
            return req.db.from("users").insert({email, hash});
        }        
    })
    .then(() => {
        res.status(201)
        .json({"success" : true, "message" : "User created"});
    })
    .catch((error) => {
        res.status(error.Status)
        .json({"error" : true, "message" : error.Message})
    })
})

// check if user s in database and give them a jwt
router.post("/login", (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        res.status(400)
        .json({"error" : true, "message" : "Request body incomplete - email and password needed"});
        return
    }

    req.db
    .from("users")
    .select('*')
    .where("email", "=", email)
    .then((users) => {
        if (users.length === 0) {
            throw {Status: 401, Message: "User does not exist."};
        } else {
            const user = users[0];
            return bcrypt.compare(password, user.hash);
        }
    })
    .then((match) => {
        if (!match) {
            throw {Status: 401, Message : "Incorrect email or password"};
        } else {
            const secretKey = "secret key"
            const expires_in = 60 * 60 * 24
            const exp = Date.now() + expires_in * 1000
            const token = jwt.sign({email, exp}, secretKey)
            res.status(200)
            .json({token, token_type: "Bearer", expires_in})
        }
    })
    .catch((error) => {
        res.status(error.Status)
        .json({"error" : true, "message" : error.Message})
    })
})

module.exports = router;