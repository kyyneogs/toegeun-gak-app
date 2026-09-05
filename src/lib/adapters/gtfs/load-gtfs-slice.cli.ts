import { resolve } from 'node:path';
import { loadGtfsSliceFromDirectory } from '$lib/adapters/gtfs/load-gtfs-slice';

const directory = process.env.GTFS_DIR?.trim();

if (!directory) {
	console.error('GTFS_DIR is required to load GTFS CSV into DATABASE_URL');
	process.exit(1);
}

if (!process.env.DATABASE_URL?.trim()) {
	console.error('DATABASE_URL is required; do not load a nationwide feed onto Vercel disk');
	process.exit(1);
}

if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL.trim())) {
	console.error(
		'DATABASE_URL must be a postgresql:// URI from Supabase Settings > Database, not https://….supabase.co'
	);
	process.exit(1);
}

const result = await loadGtfsSliceFromDirectory(resolve(directory));
console.info('done', result);
