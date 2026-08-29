import { parseCsvLine, stripBom } from '$lib/adapters/gtfs/gtfs-csv';
import { describe, expect, it } from 'vitest';

describe('gtfs csv', () => {
	it('splits quoted fields that contain commas', () => {
		expect(parseCsvLine('a,"b,c",d')).toEqual(['a', 'b,c', 'd']);
	});

	it('unescapes doubled quotes', () => {
		expect(parseCsvLine('"say ""hi"""')).toEqual(['say "hi"']);
	});

	it('strips a UTF-8 BOM', () => {
		expect(stripBom('\uFEFFroute_id')).toBe('route_id');
	});
});
