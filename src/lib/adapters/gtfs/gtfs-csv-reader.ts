import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseCsvLine, stripBom } from '$lib/adapters/gtfs/gtfs-csv';

export async function forEachCsvRow(
	filePath: string,
	onRow: (row: Record<string, string>) => void
): Promise<void> {
	const stream = createReadStream(filePath, { encoding: 'utf8' });
	const lines = createInterface({ input: stream, crlfDelay: Infinity });
	let headers: string[] | null = null;

	try {
		for await (const rawLine of lines) {
			const line = stripBom(rawLine).replace(/\r$/, '');

			if (line.trim().length === 0) {
				continue;
			}

			const fields = parseCsvLine(line);

			if (!headers) {
				headers = fields.map((header) => header.trim());
				continue;
			}

			const row: Record<string, string> = {};

			for (let index = 0; index < headers.length; index += 1) {
				const header = headers[index];

				if (!header) {
					continue;
				}

				row[header] = fields[index] ?? '';
			}

			onRow(row);
		}
	} finally {
		lines.close();
		stream.destroy();
	}
}
