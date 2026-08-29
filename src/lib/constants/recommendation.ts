export const CANDIDATE_INTERVAL_MINUTES = 5;
export const DEFAULT_DEPARTURE_WINDOW_MINUTES = 60;
export const DEFAULT_DEPARTURE_FROM = '18:00';

export const WEIGHT_TOTAL_TIME = 1;
export const WEIGHT_WAITING_TIME = 0.4;
export const WEIGHT_TRANSFER = 0.2;
export const WEIGHT_EARLY_DEPARTURE = 0.15;

export const REFERENCE_TOTAL_TIME_SECONDS = 60 * 60;
export const REFERENCE_WAITING_TIME_SECONDS = 20 * 60;

export const SCORE_TIE_EPSILON = 1e-9;

export const NEAR_BEST_TOTAL_TIME_SECONDS = 3 * 60;
export const LOW_WAITING_TIME_SECONDS = 3 * 60;

export const MOCK_WALK_TO_STOP_MINUTES = 6;
export const MOCK_BUS_RIDE_MINUTES = 23;
export const MOCK_WALK_TO_DEST_MINUTES = 2;
export const MOCK_BUS_INTERVAL_MINUTES = 20;
export const MOCK_FIRST_BUS = '18:00';
export const MOCK_LAST_BUS = '23:00';
export const MOCK_ROUTE_NAME = '146';
export const MOCK_ROUTE_LOOKUP_DELAY_MS = 80;
export const PLACE_SEARCH_DEBOUNCE_MS = 250;
