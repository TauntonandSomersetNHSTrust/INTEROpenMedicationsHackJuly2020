exports.medicineJSONToHTML = (json) => {
	return new Promise((resolve, reject) => {
		let table = '<table class="table"><th>Start Date</th><th>Medication</th><th>Dosage</th><th>Additional</th><th>Duration</th>';
		for(let e of json.entry) {
			table += '<tr>';
			let d = new Date(e.startDate);
			table += `<td>${d.getFullYear()}-${d.getMonth()}-${d.getDate()}</td>`;
			table += `<td>${e.medication}</td>`;
			table += `<td>${e.dosage}</td>`;
			table += `<td>${e.additional}</td>`;
			table += `<td>${e.duration}</td>`;
			table += '</tr>';
		}

		table += '</table>'
		return resolve(table);
	});
};

exports.allergyJSONToHTML = (json) => {
	return new Promise((resolve, reject) => {

		const reduceAllergyReactions = (reaction) => {
			let reduced = '';
			console.log(reaction);
			for(let r of reaction) {
				if(reduced.length > 0) {
					reduced += ', ';
				}
				for(let m of r.manifestation) {
					for(let c of m.coding) {
						reduced += c.display
					}
				}
				reduced += ` (${r.severity})`;
			}
			return reduced;
		};

		const reduceAllergyCoding = (coding) => {
			let reduced = '';
			for(let c of coding) {
				if(reduced.length > 0) {
					reduced += ', ';
				}
				reduced += c.display
			}
			return reduced;
		};

		console.log('allergy json: ', json);

		let table = '<table class="table"><th>Start Date</th><th>Details</th>';
		for(let e of json.entry) {
			console.log(e);
			if(e.resource.title.includes('Allergies and')) {
				for(let i of e.resource.entry) {
					table += '<tr>';

					let d = new Date(i.resource.onsetDateTime);
					table += `<td>${d.getFullYear()}-${(''+d.getMonth()).padStart(2, 0)}-${(''+d.getDate()).padStart(2, 0)}</td>`;
					console.log(e.resource);
					table += `<td>${reduceAllergyCoding(i.resource.code.coding)} - ${reduceAllergyReactions(i.resource.reaction)}</td>`;
					table += '</tr>';
				}

			}
		}

		table += '</table>'
		return resolve(table);
	});
};
