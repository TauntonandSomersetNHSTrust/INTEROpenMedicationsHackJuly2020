const CryptoJS = require("crypto-js");
const { v4: uuid } = require('uuid');

const request = require('request');

const logger = require('./logger');

exports.getJWT = (scope) => {
	const requesting_organization_ODS_Code = "A11111";
	// Construct the JWT token for the request
	const currentTime = new Date();
	const expiryTime = new Date(currentTime.getTime() + 300000); // 5 mins after current time
	const jwtCreationTime = Math.round(currentTime.getTime() / 1000);
	const jwtExpiryTime = Math.round(expiryTime.getTime() / 1000);
	const header = {
		"alg": "none",
		"typ": "JWT"
	};

	const payload = require('./../secure/jwtpayload.json');
	payload.exp = jwtExpiryTime;
	payload.iat = jwtCreationTime;
	payload.requesting_organization.identifier[0].value = requesting_organization_ODS_Code;
	payload.requested_scope = scope;

	// Encode the JWT data into the base64url encoded string
	var stringifiedHeader = CryptoJS.enc.Utf8.parse(JSON.stringify(header));
	var encodedHeader = base64url(stringifiedHeader);
	var stringifiedPayload = CryptoJS.enc.Utf8.parse(JSON.stringify(payload));
	var encodedPayload = base64url(stringifiedPayload);
	return encodedHeader + "." + encodedPayload + ".";
};

function base64url(source) {
	// Encode in classical base64
	encodedSource = CryptoJS.enc.Base64.stringify(source);
	// Remove padding equal characters
	encodedSource = encodedSource.replace(/=+$/, '');
	// Replace characters according to base64url specifications
	encodedSource = encodedSource.replace(/\+/g, '-');
	encodedSource = encodedSource.replace(/\//g, '_');
	//logger.debug('Generated JWT:');
	//logger.debug(encodedSource);
	return encodedSource;
}


exports.getStructuredMedicalRecord = (nhsNo) => {
	return new Promise((resolve, reject) => {

		const body =  require('./../secure/structuredpatientrequest.json');
		body.parameter[0].valueIdentifier.value = '' + nhsNo;

		const qs = require('querystring');
		
		console.log([process.env.GPConnect_1_Base, 'Patient/$gpc.getstructuredrecord'].join('/'));
		/*
		var requestData = {
		  resourceType: "Parameters",
		  parameter: [
		  {
			name : "patientNHSNumber",
			valueIdentifier : {
				system : "https://fhir.nhs.uk/Id/nhs-number",
				value : nhsNo
			}
		  },
		  {
			name : "includeAllergies",
			part : [{
				name: "includeResolvedAllergies",
				valueBoolean: true
			}]
		  },
		  {
			name : "includeMedication",
			part : [{
				name: "includePrescriptionIssues",
				valueBoolean: true
			},
			{
				name: "medicationSearchFromDate",
				valueBoolean: true
			}]
		  }
		  ]
		};

		*/
		console.log(body);
		const options = {
			method: 'POST',
			url: 'https://orange.testlab.nhs.uk/gpconnect-demonstrator/v1/fhir/Patient/$gpc.getstructuredrecord',
			//json: true,
			body: JSON.stringify(body),
			headers: {
				'Content-Type': process.env.GPConnect_Accept,
				'Accept': process.env.GPConnect_Accept,
				'Ssp-From': process.env.GPConnect_SSPFrom,
				'Ssp-To': process.env.GPConnect_SSPTo,
				'Ssp-InteractionID': process.env.GPConnect_SSPInteractionID_Structured,
				'Ssp-TraceID': uuid(),
				'Authorization': 'Bearer ' + this.getJWT('patient/*.read')
			}
		};

		console.log(options);

		request(options, (error, response, body) => {
			if (error) {
				return reject(error);
			}
			return resolve(JSON.parse(body));
		});
	});
};

exports.getStructuredMedicalRecordDemo = (nhsNo) => {
	return new Promise((resolve, reject) => {

		const body =  require('./../secure/patients/'+nhsNo+'.json');

		return resolve(body);

	});
};

exports.getPatientByNHSNo = (nhsNo) => {
	return new Promise((resolve, reject) => {
		const options = {
			method: 'GET',
			url: [process.env.GPConnect_1_Base, process.env.GPConnect_1_patient].join('/') + nhsNo,
			headers: {
				'Accept': process.env.GPConnect_Accept,
				'Ssp-From': process.env.GPConnect_SSPFrom,
				'Ssp-To': process.env.GPConnect_SSPTo,
				'Ssp-InteractionID': process.env.GPConnect_SSPInteractionID_Patient,
				'Ssp-TraceID': uuid(),
				'Authorization': 'Bearer ' + this.getJWT('organization/*.read')
			}
		};

		console.log(options);

		request(options, (error, response, body) => {
			if (error) {
				return reject(error);
			}
			return resolve(JSON.parse(body));
		});
	});
}

exports.metadata = () => {
	return new Promise((resolve, reject) => {
		const options = {
			method: 'GET',
			url: [process.env.GPConnect_1_Base, process.env.GPConnect_1_metadata].join('/'),
			headers: {
				'Accept': process.env.GPConnect_Accept,
				'Ssp-From': process.env.GPConnect_SSPFrom,
				'Ssp-To': process.env.GPConnect_SSPTo,
				'Ssp-InteractionID': process.env.GPConnect_SSPInteractionID_Metadata,
				'Ssp-TraceID': uuid(),
				'Authorization': 'Bearer ' + this.getJWT('organization/*.read')
			}
		};

		console.log(options);

		request(options, (error, response, body) => {
			if (error) {
				return reject(error);
			}
			return resolve(JSON.parse(body));
		});
	});
};
