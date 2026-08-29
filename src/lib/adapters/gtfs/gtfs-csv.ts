export function parseCsvLine(line: string): string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let index = 0; index < line.length; index += 1) {
		const character = line[index];

		if (inQuotes) {
			if (character === '"') {
				if (line[index + 1] === '"') {
					current += '"';
					index += 1;
				} else {
					inQuotes = false;
				}
			} else {
				current += character;
			}
			continue;
		}

		if (character === '"') {
			inQuotes = true;
			continue;
		}

		if (character === ',') {
			fields.push(current);
			current = '';
			continue;
		}

		current += character;
	}

	fields.push(current);
	return fields;
}

export function stripBom(value: string): string {
	return value.replace(/^\uFEFF/, '');
}
