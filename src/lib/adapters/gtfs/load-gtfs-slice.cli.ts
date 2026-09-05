import { resolve } from 'node:path';
import { loadGtfsSliceFromDirectory } from '$lib/adapters/gtfs/load-gtfs-slice';
import { localGtfsDirectory } from '$lib/constants/gtfs-paths';

const directory = localGtfsDirectory(process.env.GTFS_DIR);

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
