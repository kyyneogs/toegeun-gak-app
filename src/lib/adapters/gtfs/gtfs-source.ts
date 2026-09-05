export type GtfsTimetableSource = 'sql' | 'csv' | 'empty';

export function chooseGtfsTimetableSource(input: {
	remotePostgres: boolean;
	hasSqlSlice: boolean;
	hasLocalCsv: boolean;
}): GtfsTimetableSource {
	if (input.remotePostgres) {
		return input.hasSqlSlice ? 'sql' : 'empty';
	}

	if (input.hasLocalCsv) {
		return 'csv';
	}

	return 'empty';
}
