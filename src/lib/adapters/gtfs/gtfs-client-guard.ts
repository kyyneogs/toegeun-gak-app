if (typeof window !== 'undefined') {
	throw new Error('GTFS files stay on the server. The browser never loads the feed.');
}

export const GTFS_STAYS_ON_SERVER = true;
