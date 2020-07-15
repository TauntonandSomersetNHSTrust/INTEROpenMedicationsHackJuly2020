
function searchObj(needle, haystack) {
	let found = false;
	let key = null;

	result = { found, key };
	return result;

}

exports.getNormalizedMedicineInfo = (structuredRecord) => {
	return new Promise((resolve, reject) => {
		let meds = [];
		let stats = [];
		let reqs = [];
		let drugs = [];

		for(let r of structuredRecord.entry) {
			if(r.resource.resourceType === 'List' && r.resource.title.includes('Medications and')) {
				meds.push(r.resource);
			}

			if(r.resource.resourceType === 'MedicationStatement') {
				stats.push(r.resource);
			}

			if(r.resource.resourceType === 'Medication') {
				drugs.push(r.resource);
			}

			if(r.resource.resourceType === 'MedicationRequest') {
				reqs.push(r.resource);
			}

			let body = {
				resourceType: structuredRecord.resourceType,
				meta: structuredRecord.meta,
				type: structuredRecord.type,
				entry: []
			};

			for(let m of meds) {
				let newEntry = [];
				for(let e of m.entry)
				{
					let details = {};
					const statRef = e.item.reference.split('/');
					const stat = stats.find((s) => {
						return s.id == statRef[1];
					});

					if(stat) {
						details.dosage = stat.dosage[0].text;
						details.additional = stat.dosage[1].patientInstruction;
						const reqRef = details.medicationReference.reference.split('/');
						const medreq = reqs.find((r) => {
							r.id = reqRef[1];
						});
						
						if(medreq) {
							details.duration = medreq.dispenseRequest.expectedSupplyDuration.value;
							details.startDate = medreq.dispenseRequest.validityPeriod.start;
						}

						const drugRef = details.medicationReference.reference.split('/');
						const meddrug = drugs.find((d) => {
							d.id = drugRef[1];
						});
					}
				}
			}
	}):
};

exports.getNormalizedAllergyInfo = (structuredRecord) => {
	return new Promise((resolve, reject) => {
		let body = {
			resourceType: structuredRecord.resourceType,
			meta: structuredRecord.meta,
			type: structuredRecord.type,
			entry: []
		};

		const currentAllergies = structuredRecord.entry.filter((e) => {
			return e.resource.resourceType === "AllergyIntolerance";
		});

		//console.log('current allergies:', currentAllergies);

		const lists = structuredRecord.entry.filter((e) => {
			return e.resource.resourceType === "List";
		});

		const formerLists = lists.filter((l) => {
			return l.resource.title === "Ended allergies";
		});

		//console.log('Former lists:', formerLists);

		for(let fl of formerLists) {
			let entry = fl.resource.entry;
			let newEntry = [];
			for(let e of entry) {
				const allergyRef = e.item.reference;
				if(allergyRef) {
					const r = allergyRef.split('#');
					//console.log(r);
					if(r && r.length == 2) {
						const aRecord = fl.resource.contained.find((a) => {
							//console.log('Looking for: ', a.id, a.resourceType)
							return a.resourceType === 'AllergyIntolerance' && a.id == r[1];
						});
						//console.log(aRecord);
						if(aRecord) {
							newEntry.push({resource: aRecord});
						}
					}
				}
			}
			fl.resource.contained = [];
			fl.resource.entry = newEntry;
		}

		const currentLists = lists.filter((l) => {
			return l.resource.title.includes('Allergies');
		});

		//console.log('Current Lists:', currentLists);

		for(let cl of currentLists) {
			let entry = cl.resource.entry;
			let newEntry = [];
			for(let e of entry) {
				const allergyRef = e.item.reference;
				if(allergyRef) {
					const r = allergyRef.split('/');
					if(r && r.length == 2) {
						const aRecord = currentAllergies.find((a) => {
							return a.resource.id == r[1];
						});
						if(aRecord) {
							newEntry.push(aRecord);
						}
					}
				}
			}
			cl.resource.entry = newEntry;
		}

		body.entry = [...currentLists, ...formerLists];

		return resolve(body);
	});
}

exports.getSummaryFromGPCStructured = (GPStructured) => {
	return new Promise((resolve, reject) => {
		console.log(GPStructured);
		let collection = {};

		for (let a = 0; a< GPStructured.entry.length; a++) {
			if(GPStructured.entry[a].resource.resourceType) {
				//console.log(GPStructured.entry[i].resource.resourceType); // Or some other logic.
				if(!collection[GPStructured.entry[a].resource.resourceType]){
					collection[GPStructured.entry[a].resource.resourceType] = [];
				}
				//ollection[GPStructured.entry[i].resource.resourceType].push(GPStructured.entry[i].resource);
				if(GPStructured.entry[a].resource.resourceType.toLowerCase() === 'list'){
					let tidylist = {
						title : GPStructured.entry[a].resource.title,
						status : GPStructured.entry[a].resource.status,
						code : GPStructured.entry[a].resource.code,
						entries :[]
					}

					// console.log(tidylist);
					// console.log('');
					// collection[GPStructured.entry[a].resource.resourceType].push(tidylist);

					if(GPStructured.entry[a].resource.entry && GPStructured.entry[a].resource.entry.length > 0) {
						for (let x = 0; x < GPStructured.entry[a].resource.entry.length; x++ ){
							console.log(GPStructured.entry[a].resource.entry[x]);
							let shinyEntry = {};
							let eId = GPStructured.entry[a].resource.entry[x].item.reference;
							if(eId.startsWith('#') && eId.indexOf('/') == -1 ){
								eId = eId.replace('#','');
							}
							console.log(eId);
							console.log("searching.....");
							let found = false;
							console.log(GPStructured.entry[a].resource);
							if(GPStructured.entry[a].resource.contained && GPStructured.entry[a].resource.contained.length > 0) { // Are We Self Contained?
								for (let b = 0; b < GPStructured.entry[a].resource.entry[x].contained.length; b++) {
									console.log(GPStructured.entry[a].resource.entry[x].contained[b]);
									if(GPStructured.entry[a].resource.entry[x].contained[b] && GPStructured.entry[a].resource.entry[x].contained[b].toLowerCase() === eId.toLowerCase()) {
										shinyEntry = GPStructured.entry[a].resource.entry[x].contained[b];
										found = true;
									}
								}
							}

							console.log("more searching.....");

							if(found === false && GPStructured.entry.length > 0){
								const type = eId.split('/')[0] ? eId.split('/')[0].replace('/') : eId.split('/')[0];
								const id = eId.split('/')[1] ? eId.split('/')[1].replace('/') : eId.split('/')[0];
								for (sEntry in GPStructured.entry) {
									if(sEntry.resourceType && sEntry.resourceType.toLowerCase() === type.toLowerCase() && sEntry.id && sEntry.id == id ) {
										shinyEntry = sEntry;
										found=true;
									}
								}
							}

							if(found === false) {
								let shinyEntry = GPStructured.entry[a].resource.entry[x].item;
							}
							tidylist.entries.push(shinyEntry);
						}
					}
				}
			}

		}

		console.log (collection);
		const body =  collection;

		return resolve(body);

	});
}
