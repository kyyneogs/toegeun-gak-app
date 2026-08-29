import { json } from '@sveltejs/kit';

// Reserved for a future secret-key proxy. The client uses PlaceService adapters today.
export function GET() {
	return json({
		configured: false,
		message:
			'Place search is provided by PlaceService adapters. This endpoint is reserved for a future secret-key proxy.'
	});
}
