require('custom-env').env('development');

// Express HTTP server
const bodyParser = require('body-parser');
const cors = require('cors');
const { execSync } = require('child_process');
const express = require('express');
const fs = require('fs');
const helmet = require('helmet');
const nocache = require('nocache');
const path = require('path');

// Set Up Logging
const logger = require('./handlers/logger');

// Express
const app = express();
const options = {
	limit: process.env.payLoadLimit,
};

let server;

if (process.env.useTLS.toLowerCase() === 'true') {
	const parentDir = path.resolve(process.cwd(), '');
	logger.debug(`Current working dir: ${parentDir}`);
	const execOptions = { encoding: 'utf-8', windowsHide: true, cwd: parentDir };
	const key = path.resolve(process.env.keyFile, '');
	logger.debug(`Private key: ${key}`);
	const certificate = path.resolve(process.env.certFile, '');
	logger.debug(`Private certificate: ${certificate}`);
	const tmpKeyFile = path.resolve('./key.tmp.pem');
	logger.debug(`Temp key file: ${tmpKeyFile}`);
	if (!fs.existsSync(key) || !fs.existsSync(certificate)) {
		logger.info('Certificate files not found attempting auto gernerate; requires OpenSSL');

		try {
			execSync('openssl version', execOptions, (error, stdout, stderr) => {
				if (error) {
					logger.error(error);
					return;
				}
				if (stderr) {
					logger.error(stderr);
				} else {
					logger.debug(stdout);
				}
			});
			execSync(
				`openssl req -x509 -newkey rsa:2048 -keyout "${tmpKeyFile}" -out "${certificate}" -days 3650 -nodes -subj "/C=GB/ST=Foo/L=Bar/O=N00bs/CN=localhost"`,
				execOptions,
			);
			execSync(`openssl rsa -in "${tmpKeyFile}" -out "${key}"`, execOptions, (error, stdout, stderr) => {
				if (error) {
					logger.error(error);
					return;
				}
				if (stderr) {
					logger.error(stderr);
				} else {
					logger.debug(stdout);
				}
			});

			if (process.platform === 'win32') {
				execSync(`del "${tmpKeyFile}" /f`, execOptions, (error, stdout, stderr) => {
					if (error) {
						logger.error(error);
						return;
					}
					if (stderr) {
						logger.error(stderr);
					} else {
						logger.debug(stdout);
					}
				});
			} else {
				execSync(`rm -f "${tmpKeyFile}"`, execOptions, (error, stdout, stderr) => {
					if (error) {
						logger.error(error);
						return;
					}
					if (stderr) {
						logger.error(stderr);
					} else {
						logger.debug(stdout);
					}
				});
			}
		} catch (error) {
			if (error) {
				logger.error('Error intiating secure server.');
				logger.error(JSON.stringify(error));
			}
		}
	}
	if (fs.existsSync(key) || fs.existsSync(certificate)) {
		options.key = fs.readFileSync(key);
		options.cert = fs.readFileSync(certificate);
		options.passphrase = 'password';
		logger.debug(`Starting server with the following options: ${JSON.stringify(options)}`);
		server = require('https').createServer(options, app);
	} else {
		logger.error('Cert files not found');
		process.exit(1);
	}
} else {
	logger.debug(`Starting server with the following options: ${JSON.stringify(options)}`);
	server = require('http').createServer(options, app);
}


// Setup CORS
let corsOptions = {};
if (process.env.corsEnabled.toLowerCase() === 'true') {
	const whitelist = [];
	if ((process.env.allowedOrigins).includes(',')) {
		(process.env.allowedOrigins).split(',').forEach((item) => {
			whitelist.push(item.trim());
		});
	} else {
		whitelist.push(process.env.allowedOrigins);
	}
	corsOptions = {
		origin: (origin, callback) => {
			if (whitelist.indexOf(origin) !== -1) {
				callback(null, true);
			} else {
				callback(new Error('CORS failed'));
			}
		},
	};
}

// Setup Helmet
const helmetConfig = {
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'", "'unsafe-inline'"],
			styleSrc: ["'self'", "'unsafe-inline'"],
		},
	},
	frameguard: {
		action: 'deny',
	},
	hidePoweredBy: true,
};


// Middleware
app.use(helmet(helmetConfig));
app.use(nocache());
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


// router

const login = require('./handlers/login');
//const fhir = require('./handlers/fhir');
const patients = require('./handlers/patients')

app.use('/auth', login);
app.use('/data', patients);
//app.use('/', fhir);

server.listen(process.env.listenOn, 'localhost');
server.on('listening', function() {
    logger.info(`Server started on port ${server.address().port} at ${server.address().address}`);
});
