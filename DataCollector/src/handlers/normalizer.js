
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

		console.log('current allergies:', currentAllergies);

		const lists = structuredRecord.entry.filter((e) => {
			return e.resource.resourceType === "List";
		});

		const formerLists = lists.filter((l) => {
			return l.resource.title === "Ended allergies";
		});

		console.log('Former lists:', formerLists);

		const currentLists = lists.filter((l) => {
			return l.resource.title.includes('Allergies');
		});

		console.log('Current Lists:', currentLists);

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
						title : collection[GPStructured.entry[a].resource.resourceType].push(GPStructured.entry[a].resource.title),
						status : collection[GPStructured.entry[a].resource.resourceType].push(GPStructured.entry[a].resource.status),
						code : collection[GPStructured.entry[a].resource.resourceType].push(GPStructured.entry[a].resource.code),
						entries :[]
					}
					if(GPStructured.entry[a].resource.entry && GPStructured.entry[a].resource.entry.length > 0) {
						for (entry in collection[GPStructured.entry[a].resource.entry]){
							let shinyEntry = {};
							const eId = entry.item.reference;
							if(eId.startsWith('#') && eId.indexOf('/') == -1 ){
								eId = eId.replace('#','');
							}
							console.log(eId);
							if(entry.contained && entry.contained.length > 0) { // Are We Self Contained?
								found = false;
								for (let b = 0; b < entry.contained.length; b++) {
									console.log(entry.contained[b]);
									if(entry.contained[b] && entry.contained[b].toLowerCase() === eId.toLowerCase()) {
										shinyEntry = entry.contained[b];
										found = true;
									}
								}
							}

							if(found === false && GPStructured.entry.length > 0){
								const type = eId.split('/')[0].replace('/');
								const id = eId.split('/')[1].replace('/');
								for (sEntry in GPStructured.entry) {
									if(sEntry.resourceType && sEntry.resourceType.toLowerCase() === type.toLowerCase() && sEntry.id && sEntry.id == id ) {
										shinyEntry = sEntry;
										found=true;
									}
								}
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
