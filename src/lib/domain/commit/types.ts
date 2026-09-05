export interface SavedTimeSummary {
	weekSeconds: number;
	monthSeconds: number;
	lifetimeSeconds: number;
	weekLabel: string;
	monthLabel: string;
	lifetimeLabel: string;
	commitCount: number;
}

export interface RankingEntry {
	nickname: string;
	savedSeconds: number;
	savedLabel: string;
	commitCount: number;
}
