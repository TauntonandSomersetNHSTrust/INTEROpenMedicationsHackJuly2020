const express = require('express');
const errors = require('request-promise/errors');
const rp = require('request-promise');
const verifyToken = require('./verify-token');
const login = require('./login');
const gpc = require('./gpc');
const normal = require('./normalizer');
const htmlizer = require('./htmlizer');
const router = express.Router();


// Set Up Logging
const logger = require('./logger');


// Async Middleware
const asyncMiddleware = (fn) => (req, res, next) => {
	Promise.resolve(fn(req, res, next))
		.catch(next);
};

// Functions
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

const metadata = async (req, res) => {
	const response = await gpc.metadata();
	if (response) {
		res.json(response);
	} else {
		res.status(500).end();
	}
};

const getPatientByNHSNo = async (req, res) => {
	const response = await gpc.getPatientByNHSNo(req.params.nhsno);
	if (response) {
		res.json(response);
	} else {
		res.status(500).end();
	}
};

const getStructuredRecordByNhsNo = async (req, res) => {
	const response = await gpc.getStructuredMedicalRecord(req.params.nhsno);
	if (response) {
		res.json(response);
	} else {
		res.status(500).end();
	}
};

const getStructuredRecordByNhsNoDemo = async (req, res) => {
	const response = await gpc.getStructuredMedicalRecordDemo(req.params.nhsno);
	if (response) {
		res.json(response);
	} else {
		res.status(500).end();
	}
};

const getSummaryRecordByNhsNo = async (req,res) => {
	const structgpc = await gpc.getStructuredMedicalRecordDemo(req.params.nhsno);
	const response = await normal.getSummaryFromGPCStructured(structgpc);
	if (response) {
		res.json(response);
	} else {
		res.status(500).end();
	}
};

const getAlergyInfoByNhsNo = async (req,res) => {
	const struct = await gpc.getStructuredMedicalRecord(req.params.nhsno);
	const response  = await normal.getNormalizedAllergyInfo(struct);
	if (response) {
		res.json(response);
	} else {
		res.status(500).end();
	}
};

const getSimplFHIRByNhsNo = async (req,res) => {
	const struct = await gpc.getStructuredMedicalRecord(req.params.nhsno);
	let response = {};

	response.patient = 'Patient Name Here';

	const allergies  = await normal.getNormalizedAllergyInfo(struct);
	response.allergies = [];
	if(allergies && allergies.entry) {
		response.allergies = allergies.entry;
	}

	const meds = await normal.getNormalizedMedicineInfo(struct);
	response.medicine = [];
	if(meds && meds.entry) {
		response.medicine = meds.entry;
	}

	if (response) {
		res.json(response);
	} else {
		res.status(500).end();
	}
};

const getMedicineInfoByNhsNo = async (req,res) => {
	const struct = await gpc.getStructuredMedicalRecord(req.params.nhsno);
	const response = await normal.getNormalizedMedicineInfo(struct);
	if (response) {
		res.json(response);
	} else {
		res.status(500).end();
	}
};

const getMedicineInfoByNhsNoAsHtml = async (req,res) => {
	const struct = await gpc.getStructuredMedicalRecord(req.params.nhsno);
	const json = await normal.getNormalizedMedicineInfo(struct);
	const response = await htmlizer.medicineJSONToHTML(json);
	if (response) {
		res.send(response);
	} else {
		res.status(500).end();
	}
};

const getAlergyInfoByNhsNoAsHTML = async (req, res) => {
	const struct = await gpc.getStructuredMedicalRecord(req.params.nhsno);
	const json  = await normal.getNormalizedAllergyInfo(struct);
	const response = await htmlizer.allergyJSONToHTML(json);
	if (response) {
		res.send(response);
	} else {
		res.status(500).end();
	}
};

const getAlergyInfoByNhsNoDemo = async (req,res) => {
	const response = await gpc.getAlergryInfoByNhsNoDemo(req.params.nhsno);
	if (response) {
		res.json(response);
	} else {
		res.status(500).end();
	}
};

//routes
router.get('/metadata', asyncMiddleware(metadata));
router.get('/patient/:nhsno', asyncMiddleware(getPatientByNHSNo));
router.get('/structured/:nhsno', asyncMiddleware(getStructuredRecordByNhsNo));
router.get('/simplfhir/:nhsno', asyncMiddleware(getSimplFHIRByNhsNo));
router.get('/structureddemo/:nhsno', asyncMiddleware(getStructuredRecordByNhsNoDemo));
router.get('/GPCSummary/:nhsno', asyncMiddleware(getSummaryRecordByNhsNo));
router.get('/allergydemo/:nhsno', asyncMiddleware(getAlergyInfoByNhsNoDemo));
router.get('/allergy/:nhsno', asyncMiddleware(getAlergyInfoByNhsNo));
router.get('/html/allergy/:nhsno', asyncMiddleware(getAlergyInfoByNhsNoAsHTML));
router.get('/medicine/:nhsno', asyncMiddleware(getMedicineInfoByNhsNo));
router.get('/html/medicine/:nhsno', asyncMiddleware(getMedicineInfoByNhsNoAsHtml));

module.exports = router;
