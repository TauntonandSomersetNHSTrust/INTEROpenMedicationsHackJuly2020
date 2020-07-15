
function searchObj(needle, haystack) {
	let found = false;
	let key = null;

	result = { found, key };
	return result;

}

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
							if(GPStructured.entry[a].resource.contained && GPStructured.entry[a].resource.contained > 0) { // Are We Self Contained?
								for (let b = 0; b < GPStructured.entry[a].resource.contained.length; b++) {
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
								for (let sEntry in GPStructured.entry) {
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
