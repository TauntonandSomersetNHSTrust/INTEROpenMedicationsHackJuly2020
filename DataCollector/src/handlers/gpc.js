const CryptoJS = require("crypto-js");
const { v4: uuid } = require('uuid');

const request = require('request');


const logger = require('./logger');

exports.getJWT = () => {
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
	logger.debug('Generated JWT:');
	logger.debug(encodedSource);
	return encodedSource;
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
				'Ssp-InteractionID': process.env.GPConnect_SSPInteractionID,
				'Ssp-TraceID': uuid(),
				'Authorization': 'Bearer ' + this.getJWT()
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
