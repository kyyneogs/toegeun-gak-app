import { listStandupJobsResponse, cancelStandupJobResponse } from '$lib/server/standup-http';

export async function GET({ cookies }) {
	return listStandupJobsResponse(cookies);
}

export async function DELETE({ request, cookies }) {
	return cancelStandupJobResponse(cookies, request);
}
