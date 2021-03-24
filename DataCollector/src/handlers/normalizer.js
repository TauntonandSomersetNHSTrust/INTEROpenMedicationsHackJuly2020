
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

		//console.log('struc:', structuredRecord);

		for(let r of structuredRecord.entry) {
			if(r.resource.resourceType === 'List' && r.resource.title.includes('Medications and')) {
				meds.push(r.resource);
			}

			if(r.resource.resourceType === 'MedicationStatement') {
				stats.push(r.resource);
			}


			if(r.resource.resourceType === 'Medication') {
				console.log(r.resource.id, r.resource.code.coding[0].display);
				drugs.push(r.resource);
			}


			if(r.resource.resourceType === 'MedicationRequest') {
				reqs.push(r.resource);
			}

		}
		// console.log('statements: ', meds);
		// console.log('stats: ', stats);
		// console.log('drugs: ', drugs);
		// console.log('reqs: ', reqs);

		let body = {
			resourceType: structuredRecord.resourceType,
			meta: structuredRecord.meta,
			type: structuredRecord.type,
			entry: []
		};


		for(let m of meds) {
			//console.log('entries:', m.entry);
			for(let e of m.entry) {

				let details = {};
				const statRef = e.item.reference.split('/');
				const stat = stats.find((s) => {
					return s.id == statRef[1];
				});

				//console.log(stat);
				if(stat) {

					details.dosage = stat.dosage[0].text;
					details.additional = stat.dosage[0].patientInstruction;
					if(stat.effectivePeriod.start) {
						const dt = new Date(stat.effectivePeriod.start);
						details.startDate = [(dt.getDate()+'').padStart(2, '0'),
																	((dt.getMonth()+1)+'').padStart(2, '0'),
																	dt.getFullYear()].join('-')
					}

					const reqRef = stat.basedOn[0].reference.split('/');
					const medreq = reqs.find((r) => {
						return r.id = reqRef[1];
					});

					if(medreq) {
						details.duration = medreq.dispenseRequest.expectedSupplyDuration.value;
					}

					const drugRef = stat.medicationReference.reference.split('/');
					//console.log('looking for... ', drugRef);
					const meddrug = drugs.find((d) => {
						//console.log('drug', d.code.coding[0].display, d.id);
						return d.id == drugRef[1];
					});

					if(meddrug) {
						details.medication = meddrug.code.coding[0].display;
					}
				}
				body.entry.push(details);
			}
		}
		return resolve(body);
	});
};

function parseCausesAndReactions(list) {
	let allergies = [];

	const removeBrackets = (text) => {
		return text.replace('(', '- ').replace(')', '');
	};

	for(let fl of list) {
		console.log('l: ', fl);

		let entry = fl.resource.contained;
		if(!entry) {
			entry = [fl.resource];
		}

		for(const e of entry) {
			let reactions = [];
			let causes = [];
			if(e.code && e.code.coding) {
				const sno = e.code.coding.filter((s) => {
					return s.system.includes('snomed');
				});
				for(const s of sno) {
					causes.push({
						name: removeBrackets(s.display),
						snomed_code: s.code
					});
				}
			}

			if(e.reaction) {
				for(const r of e.reaction) {
					for(const m of r.manifestation) {
						for(const c of m.coding) {
							if(c.system && c.system.includes('snomed')) {
								reactions.push({
									reaction: removeBrackets(c.display),
									snomed_code: c.code
								});
							}
						}
					}
				}
			}

			allergies.push({
				id: e.id,
				cause: causes,
				reaction: reactions
			});
		}
	}
	return allergies;
}

exports.getNormalizedAllergyInfo = (structuredRecord) => {
	return new Promise((resolve, reject) => {
 		console.log('current allergies:', structuredRecord);

		const currentLists = structuredRecord.entry.filter((c) => {
			return c.resource.resourceType == 'AllergyIntolerance';
		});

		const formerLists = structuredRecord.entry.filter((e) => {
			return  e.resource.resourceType === "List" && e.resource.title === "Ended allergies";
		});

		return resolve({
			entry: {
				current: parseCausesAndReactions(currentLists),
				former: parseCausesAndReactions(formerLists)
		}});
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
