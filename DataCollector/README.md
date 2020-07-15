# GP Connect Data Collector

### Environment file

.env.development

```
#Service
listenOn=8080

#Transport Encryption
useTLS=false
keyFile=./privatekey.pem
certFile=./cert.pem
passPhrase=password

#Security
payLoadLimit=1b

#CORS
corsEnabled=false
allowedOrigins=http://example1.com, http://example2.com

#Logging
FileLoggingEnabled=true
LogDir=./log
LogLevel=debug

#gpconnect
GPConnect_Accept=application/fhir+json
GPConnect_SSPFrom=200000000359
GPConnect_SSPTo=918999198993
GPConnect_SSPInteractionID_Metadata=urn:nhs:names:services:gpconnect:structured:fhir:rest:read:metadata-1
GPConnect_SSPInteractionID_Patient=urn:nhs:names:services:gpconnect:fhir:rest:search:patient-1
GPConnect_SSPInteractionID_Structured=urn:nhs:names:services:gpconnect:fhir:operation:gpc.getstructuredrecord-1
GPConnect_SSPTraceID: 09a01679-2564-0fb4-5129-aecc81ea2706

GPConnect_1_Base=https://orange.testlab.nhs.uk/gpconnect-demonstrator/v1/fhir
GPConnect_1_metadata=metadata
GPConnect_1_patient=Patient?identifier=https%3A%2F%2Ffhir.nhs.uk%2FId%2Fnhs-number%7C
GPConnect_1_identifier=identifier
GPConnect_1_fhir_url=https%3A%2F%2Ffhir.nhs.uk%2FId%2Fnhs-number%7C
GPConnect_1_structured=Patient/%24gpc.getstructuredrecord
```

#### Installing NodeJS

```
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -

sudo apt-get install -y nodejs
```



#### Installing PM2

```
sudo npm install pm2@latest -g
```

Generate Startup Scripts

```
pm2 startup
```



#### Launch Service

```
NODE_ENV=development pm2 start ./src/server.js -n GPCDataCollector --exp-backoff-restart-delay=1000 --watch

pm2 save 
```

