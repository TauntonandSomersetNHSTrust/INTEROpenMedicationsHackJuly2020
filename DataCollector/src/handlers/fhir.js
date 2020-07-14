const express = require('express');
const errors = require('request-promise/errors');
const rp = require('request-promise');
const verifyToken = require('./verify-token');

const router = express.Router();


// Set Up Logging
const logger = require('./logger');


// Async Middleware
const asyncMiddleware = (fn) => (req, res, next) => {
	Promise.resolve(fn(req, res, next))
		.catch(next);
};


// Functions

function getOpenIdToken() {
	let clientID = '';
	let clientSecret = '';
	let grantType = '';
	let openIdURL = '';
	let user = '';
	let pass = ''
	let reqFormData = {};
	
	if (process.env.DownstreamOpenIDSettingsEnabled.toLowerCase() === 'true') {
		clientID = process.env.openIDDownstreamClientID;
		clientSecret = process.env.openIDDownstreamClientSecret;
		openIdURL = process.env.openIDDownstreamEnpoint;
		user = process.env.openIDDownstreamUsername;
		pass = process.env.openIDDownstreamPassword;
	}
	
	if (process.env.DownstreamOpenIDSettingsEnabled.toLowerCase() === 'false') {
		clientID = process.env.openIDClientID;
		clientSecret = process.env.openIDClientSecret;
		openIdURL = process.env.openIDDirectAccessEnpoint;
		user = process.env.openIDDownstreamUsername
		pass = process.env.openIDDownstreamPassword
	}
	
	if (process.env.openIDDownstreamAccessMethod.toLowerCase() === 'clientid') {
		grantType = 'client_credentials';
		reqFormData = {
			client_id : clientID,
			client_secret : clientSecret,
			grant_type : grantType
		}
	} else if (process.env.openIDDownstreamAccessMethod.toLowerCase() === 'password') {
		grantType = 'password';
		reqFormData = {
			client_id : clientID,
			client_secret : clientSecret,
			grant_type : grantType,
			username : user,
			password : pass
		}
	}	
	
	
	const options = {
		method: 'POST',
		uri: openIdURL,
		form: {
			client_id : clientID,
			client_secret : clientSecret,
			grant_type : grantType
		},
		headers: {
			'content-type': 'application/x-www-form-urlencoded'
		},
		resolveWithFullResponse: true
	};
	const errors = require('request-promise/errors');
    return rp(options).then((response) => {
			//console.log(response);
			return response;
		}
	)
	.catch(errors.StatusCodeError, function (reason) {
        // The server responded with a status codes other than 2xx.
        // Check reason.statusCode
		logger.error(JSON.stringify(reason));
    })
    .catch(errors.RequestError, function (reason) {
        // The request failed due to technical reasons.
        // reason.cause is the Error object Request would pass into a callback.
		logger.error(JSON.stringify(reason));
    });
}

async function getFhirResponseFunc(path = '/', queryString) {
	logger.debug(`Request being forwarded to ${process.env.FHIRServerBaseURL}${path}`);
	logger.debug(`Request query parameters: ${JSON.stringify(queryString)}`);
	let headers = {};
	headers['User-Agent'] = 'FHIR-Proxy';
	if (process.env.FHIRServerAuthMethod.toLowerCase() === 'openid') {
		const tokenResp = await getOpenIdToken();
		if (tokenResp && tokenResp.statusCode && tokenResp.statusCode === 200) {
			if (tokenResp.body) {
				const body = JSON.parse(tokenResp.body);
				console.log(body.access_token);
				headers['Authorization'] = 'Bearer ' + body.access_token;
			}
		} else {
			logger.error('Unable to get Token');			
		}
	}
	const qs = require('querystring');
	// qs: queryString,
	const options = {
		uri: process.env.FHIRServerBaseURL + path + '?' + qs.stringify(queryString),
		headers: headers
	};
	const errors = require('request-promise/errors');
	return rp(options).then((response) => { return response; }
	)
	.catch(errors.StatusCodeError, function (reason) {
        // The server responded with a status codes other than 2xx.
        // Check reason.statusCode
		logger.error(JSON.stringify(reason));
    })
    .catch(errors.RequestError, function (reason) {
        // The request failed due to technical reasons.
        // reason.cause is the Error object Request would pass into a callback.
		logger.error(JSON.stringify(reason));
    });
	
	
}

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

module.exports = router;
