const express = require('express');
const errors = require('request-promise/errors');
const rp = require('request-promise');
const verifyToken = require('./verify-token');
const login = require('./login');
const router = express.Router();


// Set Up Logging
const logger = require('./logger');


// Async Middleware
const asyncMiddleware = (fn) => (req, res, next) => {
	Promise.resolve(fn(req, res, next))
		.catch(next);
};


// Functions

const getFhirResponse = async (req, res) => {
	logger.debug('New request');
	logger.debug(`Request path: ${JSON.stringify(req.path)}`);
	logger.debug(`Request query parameters: ${JSON.stringify(req.query)}`);
	const response = await getFhirResponseFunc(req.path, req.query);
	if (response) {
		res.end(response);
	} else {
		res.status(500).end();
	}
};


// Routes
router.get('/*', verifyToken, asyncMiddleware(getFhirResponse));