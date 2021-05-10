var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken');

// authenticate with jwt
const authorize = (req, res, next) => {
    const authorization = req.headers.authorization;
    var token = null;

    // if authorization present and correct, save token - otherwise deny access
    if (authorization && authorization.split(" ").length === 2) {
        token = authorization.split(" ")[1];
    } else {
        res.status(403).json({"error": true, "message": "Access denied"});
        return
    }

    // verify token and make sure it hasn't expired
    try {
        const decoded = jwt.verify(token, "secret key");
        if (decoded.exp < Date.now()) {
            res.status(403).json({"error": true, "message": "Token has expired"});
            return
        }
        next();
    } catch (error) {
        res.status(403).json({"error": true, "message": "Access denied"});
    }
}

// list all symbols, optionally filtered by industry
router.get('/stocks/symbols', (req, res) => {
    const industryParam = req.query.industry;
    req.db
    .from('stocks')
    .distinct("name", "symbol", "industry")
    .modify((query) => {
        if (industryParam) {
            query.where('industry', 'like', `%${industryParam}%`);
        }
    })
    .then((rows) => {
        if (rows.length === 0) {
            throw {Status: 404, Message: "Industry sector not found"};
        } else if (JSON.stringify(req.query) !== '{}' && !industryParam) {
            throw {Status: 400, Message: "Invalid query parameter: only 'industry' is permitted"};
        } else {
            res.status(200)
            .json(rows);    
        }
        
    })
    .catch((error) => {
        res.status(error.Status)
        .json({"error" : true, "message" : error.Message});
    })
});

// get a particualr symbol
router.get('/stocks/:symbol', (req, res) => {
    req.db
    .from('stocks')
    .select('*')
    .where('symbol', '=', req.params.symbol)
    .orderBy('timestamp', 'desc')
    .limit(1)
    .then((rows) => {
        if (rows.length === 0) {
            throw {Status: 404, Message: "No entry for symbol in stocks database"};
        } else if (req.query.from || req.query.to) {
            throw {Status: 400, Message: "Date parameters only available on authenticated route /stocks/authed"};
        } else {
            res.status(200)
            .json(rows[0]);
        }  
    })
    .catch((error) => {
        res.status(error.Status)
        .json({"error" : true, "message" : error.Message})
    })
});

// if authenticated, get stocks for a symbol between a time range
router.get('/stocks/authed/:symbol', authorize, (req, res) => {
    req.db
    .from('stocks')
    .select('*')
    .where('symbol', '=', req.params.symbol)
    .orderBy('timestamp', 'desc')
    .modify((query) => {
        if (req.query.from && req.query.to) {
            query.whereBetween('timestamp', [req.query.from, req.query.to]);
        }
    })
    .then((rows) => {
        if (req.query && !req.query.from && !req.query.to) {
            throw {Status: 400, Message: "Parameters allowed are 'from' and 'to', example: /stocks/authed/AAL?from=2020-03-15"};
        } else if (rows.length === 0) {
            throw {Status: 404, Message: "No entries available for query symbol for supplied date range"};
        } else {
            res.status(200)
            .json(rows); 
        }
    })
    .catch((error) => {
        res.status(error.Status)
        .json({"error" : true, "message" : error.Message})
    })
});

module.exports = router;