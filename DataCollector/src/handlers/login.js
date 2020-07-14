const express = require('express');

const router = express.Router();
const request = require('request');

const CryptoJS = require("crypto-js");

router.post('/login', (req, res) => {
	const user = req.body;
	const username = user.username;
	const password = user.password;
	const options = {
		method: 'POST',
		url: (process.env.openIDDirectAccessEnpoint),
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		form: {
			username,
			password,
			client_id: (process.env.openIDClientID),
			grant_type: 'password',
			client_secret: (process.env.openIDClientSecret)
		}
	};

	request(options, (error, response, body) => {
		if (error) throw new Error(error);

		const json = (JSON.parse(body));
		res.status(200).json(json);
	});
});

router.get('/GPConnectJWT', (req, res) => {
	
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

	var payload = {
	  "iss": "https://orange.testlab.nhs.uk/",
	  "sub": "1",
	  "aud": "https://orange.testlab.nhs.uk/gpconnect-demonstrator/v1/fhir",
	  "exp": jwtExpiryTime,
	  "iat": jwtCreationTime,
	  "reason_for_request": "directcare",
	  "requested_scope": "organization/*.read",
	  "requesting_device": {
		"resourceType": "Device",
		"id": "1",
		"identifier": [
		  {
			"system": "Web Interface",
			"value": "Postman example consumer"
		  }
		],
		"model": "Postman",
		"version": "1.0"
	  },
	  "requesting_organization": {
		"resourceType": "Organization",
		"identifier": [
		  {
			"system": "https://fhir.nhs.uk/Id/ods-organization-code",
			"value": requesting_organization_ODS_Code
		  }
		],
		"name": "Postman Organization"
	  },
	  "requesting_practitioner": {
		"resourceType": "Practitioner",
		"id": "1",
		"identifier": [
		  {
			"system": "https://fhir.nhs.uk/Id/sds-user-id",
			"value": "G13579135"
		  },
		  {
			"system": "https://fhir.nhs.uk/Id/sds-role-profile-id",
			"value": "111111111"
		  },
		],
		"name": [{
		  "family": "Demonstrator",
		  "given": [
			"GPConnect"
		  ],
		  "prefix": [
			"Mr"
		  ]
		}]
	  }
	};

	function base64url(source) {
	  // Encode in classical base64
	  encodedSource = CryptoJS.enc.Base64.stringify(source);
	  // Remove padding equal characters
	  encodedSource = encodedSource.replace(/=+$/, '');
	  // Replace characters according to base64url specifications
	  encodedSource = encodedSource.replace(/\+/g, '-');
	  encodedSource = encodedSource.replace(/\//g, '_');
	  return encodedSource;
	}

	// Encode the JWT data into the base64url encoded string
	var stringifiedHeader = CryptoJS.enc.Utf8.parse(JSON.stringify(header));
	var encodedHeader = base64url(stringifiedHeader);
	var stringifiedPayload = CryptoJS.enc.Utf8.parse(JSON.stringify(payload));
	var encodedPayload = base64url(stringifiedPayload);
	var jwtString = encodedHeader + "." + encodedPayload + ".";	



	const json = (jwtString);
	res.status(200).json(json);

});


module.exports = router;
