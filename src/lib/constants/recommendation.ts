import type { DisplayCriterion } from '$lib/domain/recommendation/criteria';
import type { RecommendProgressStage } from '$lib/domain/recommendation/progress';
import { formatSavedDuration } from '$lib/domain/commit/saved-time';
import { DEFAULT_STANDUP_LEAD_MINUTES } from '$lib/constants/persist';
import { accountIdentityCopy } from '$lib/domain/auth/provider';
import type { SessionUser } from '$lib/domain/auth/user';

export const DEFAULT_DEPARTURE_WINDOW_MINUTES = 60;
export const DEFAULT_DEPARTURE_FROM = '18:00';

export const MOCK_WALK_TO_STOP_MINUTES = 6;
export const MOCK_BUS_RIDE_MINUTES = 23;
export const MOCK_WALK_TO_DEST_MINUTES = 2;
export const MOCK_BUS_INTERVAL_MINUTES = 20;
export const MOCK_FIRST_BUS = '18:00';
export const MOCK_LAST_BUS = '23:00';
export const MOCK_ROUTE_NAME = '146';
export const MOCK_ROUTE_LOOKUP_DELAY_MS = 80;
export const PLACE_SEARCH_DEBOUNCE_MS = 250;

export const STAND_UP_WALK_LABEL = '이때 일어나면 돼요';
export const STAND_UP_BOARD_LABEL = '이때 타면 돼요';
export const HEADWAY_MISS_SECONDS = 60;
export const HEADWAY_ALT_COST_KRW = 15_000;
export const HEADWAY_LOSS_TITLE = '1분만 늦으면요';

export const HOME_TIME_HELPER = '이 시각 이후에 나가면, 제일 빨리 도착하는 길을 골라요.';
export const HOME_ARRIVE_BY_LABEL = '이 시각까지 도착';
export const HOME_ARRIVE_BY_HELPER =
	'약속이 있으면 켜 주세요. 그 시각에 맞춰 가장 늦게 나가는 길을 고를게요.';
export const HOME_CTA_LABEL = '퇴근각 볼게요';
export const WELCOME_INTRO = '처음 오셨군요. 몇 가지만 알려 주시면 바로 쓸 수 있어요.';
export const WELCOME_ORIGIN_TITLE = '출근하는 곳은 어디예요?';
export const WELCOME_ORIGIN_HELPER = '회사나 직장 근처 역이면 돼요.';
export const WELCOME_ORIGIN_PLACEHOLDER = '회사, 판교역';
export const WELCOME_HOME_TITLE = '퇴근하면 주로 어디로 가시나요?';
export const WELCOME_HOME_HELPER = '집이나 집 근처 역이면 돼요.';
export const WELCOME_HOME_PLACEHOLDER = '우리집, 집 근처 역';
export const WELCOME_TIME_TITLE = '평소 몇 시부터 퇴근할 수 있나요?';
export const WELCOME_NEXT_LABEL = '다음으로 갈게요';
export const WELCOME_DONE_LABEL = '이걸로 시작할게요';
export const WELCOME_SKIP_LABEL = '나중에 설정할게요';
export const WELCOME_LOGIN_HINT = '이미 계정이 있으면 로그인하세요.';
export const WELCOME_STEP_COPY = ['1 / 3', '2 / 3', '3 / 3'] as const;
export const WELCOME_READY_MARK = '퇴근각';
export const WELCOME_READY_TITLE = '준비됐어요';
export const WELCOME_READY_HELPER = '이제 퇴근각을 볼게요.';
export const ARRIVE_BY_MISSED_COPY = '이 시각까지 도착하는 길을 찾지 못했어요. 시간을 바꿔 볼게요.';
export const CRITERION_EARLIEST_ARRIVAL = '빠른 도착';
export const CRITERION_SHORTEST_DURATION = '짧은 이동';
export const CRITERION_LEAST_WALKING = '적은 도보';
export const CRITERION_FEWEST_TRANSFERS = '적은 환승';
export const CRITERION_AI_PICK = 'AI 추천';
export const CRITERION_SECTION_LABEL = '다른 기준';
export const AI_PICK_LOADING_COPY = '길을 고르는 중이에요';
export const ARRIVE_BY_RESULT_HELPER = '약속에 맞춰 가장 늦게 나가는 길이에요.';
export const OVERTIME_SECTION_LABEL = '조금 더 있을게요';
export const OVERTIME_TEN_LABEL = '10분 더';
export const OVERTIME_THIRTY_LABEL = '30분 더';
export const OVERTIME_STEPS_MINUTES = [10, 30] as const;
export const COMMIT_CTA_LABEL = '이 길로 갈게요';
export const COMMIT_LOGIN_CTA = '로그인하고 맞출게요';
export const COMMIT_DONE_LABEL = '알림을 맞춰 두었어요';
export const COMMIT_NEED_ACCOUNT = '알림과 기록을 남기려면 로그인해 주세요.';
export const PUSH_IOS_HINT = '아이폰은 홈 화면에 퇴근각을 추가해야 알림을 받을 수 있어요.';
export const LOGIN_TITLE = '로그인';
export const REGISTER_TITLE = '회원가입';
export const LOGIN_CTA = '로그인할게요';
export const REGISTER_CTA = '가입할게요';
export const OAUTH_GOOGLE_CTA = 'Google로 시작하기';
export const OAUTH_DIVIDER = '또는 이메일로';
export const REGISTER_CHECK_EMAIL = '인증 메일을 보냈어요. 받은편지함을 확인해 주세요.';
export const RESEND_EMAIL_CTA = '인증 메일 다시 보낼게요';
export const RESET_PASSWORD_TITLE = '비밀번호 재설정';
export const RESET_PASSWORD_CTA = '재설정 메일을 보낼게요';
export const RESET_PASSWORD_SENT = '재설정 메일을 보냈어요. 받은편지함을 확인해 주세요.';
export const RESET_PASSWORD_UPDATE_CTA = '새 비밀번호로 바꿀게요';
export const RESET_PASSWORD_LINK = '비밀번호를 잊었어요';
export const AUTH_PENDING_OK = '확인했어요';
export const LOGOUT_CTA = '로그아웃할게요';
export const EMAIL_LABEL = '이메일';
export const PASSWORD_LABEL = '비밀번호';
export const NICKNAME_LABEL = '닉네임';
export const NICKNAME_SAVE_CTA = '닉네임 저장할게요';
export const RECORD_TITLE = '아낀 시간';
export const RECORD_WEEK_LABEL = '이번 주';
export const RECORD_MONTH_LABEL = '이번 달';
export const RECORD_LIFE_LABEL = '평생';
export const RECORD_EMPTY = '아직 확정한 퇴근각이 없어요. 결과에서 이 길로 갈게요를 눌러 주세요.';
export const RANKING_TITLE = '이번 주 랭킹';
export const RANKING_SAVED_LABEL = '제일 많이 아낀 사람';
export const RANKING_EMPTY = '이번 주 랭킹에 오른 사람이 아직 없어요.';
export const RANKING_OPT_IN_LABEL = '이번 주 랭킹에 닉네임을 올려요';
export const PUSH_LEAD_LABEL = '일어나기 알림';
export const PUSH_LEAD_HELPER = `자리에서 일어나기 몇 분 전에 알려 줄까요? 기본은 ${DEFAULT_STANDUP_LEAD_MINUTES}분 전이에요.`;
export const PUSH_LEAD_AT_STANDUP_LABEL = '일어날 때';
export const PUSH_LEAD_BEFORE_SUFFIX = '분 전';
export const STANDUP_SCHEDULED_LABEL = '맞춰 둔 알림';
export const STANDUP_SCHEDULED_EMPTY = '맞춰 둔 알림이 없어요.';
export const STANDUP_SCHEDULED_LOGIN = '맞춰 둔 알림을 보려면 로그인해 주세요.';
export const STANDUP_PAGE_TITLE = '알림';
export const STANDUP_CANCEL_ARIA = '알림 지우기';
export const STANDUP_CANCEL_MARK = '×';
export const STANDUP_CANCEL_HELPER = '이 탭을 닫거나 새로고침해야 기기 타이머도 꺼져요.';
export const STANDUP_EXISTING_TITLE = '이미 맞춰 둔 알림이 있어요';
export const STANDUP_REPLACE_CTA = '이전 알림을 지우고 이걸로 맞출게요';
export const STANDUP_KEEP_CTA = '그대로 두고 하나 더 맞출게요';
export const STANDUP_VIEW_LINK = '맞춰 둔 알림 보기';
export const STANDUP_ROUTE_MISSING = '이 알림에는 저장된 경로가 없어요.';
export const PUSH_DEVICE_UNAVAILABLE = '알림은 예약했지만 이 기기 푸시는 못 받았어요.';
export const ACCOUNT_SECTION_LABEL = '계정';
export const ACCOUNT_GOOGLE_LABEL = 'Google 계정';
export const ACCOUNT_EMAIL_LABEL = '이메일 계정';
export const RESULT_LOADING_COPY = '퇴근각을 계산하고 있어요.';
export const LOADING_SEARCHING_ROUTES = '경로를 검색 중이에요';
export const LOADING_ROUTES_FOUND = '경로를 찾았어요';
export const LOADING_TIMING_ROUTES = '최적 경로를 탐색 중이에요';
export const LOADING_AI_PICKING = 'AI가 추천 중이에요';
export const HEADWAY_DELAY_SUPPORT = '집에 늦게 도착해요.';
export const HEADWAY_LAST_TRAIN_SUPPORT = '막차를 놓칠 수 있어요. 택시는 예상이에요.';
export const RESULT_ERROR_TITLE = '지금은 추천할 수 없어요';
export const RESULT_RETRY_CTA = '다시 볼게요';
export const RESULT_ROUTE_CTA = '어떻게 가는지 볼게요';
export const RESULT_NAV_TITLE = '오늘의 퇴근각';
export const RESULT_WALK_LABEL = '걷는 시간';
export const RESULT_WAIT_LABEL = '기다리는 시간';
export const RESULT_TOTAL_LABEL = '모두';
export const ROUTE_PAGE_TITLE = '어떻게 가나요';
export const SETTINGS_HEADING = '내 정보';
export const SETTINGS_DEPARTURE_LABEL = '퇴근할 수 있는 시간';
export const NAV_BACK = '뒤로';
export const TIMELINE_TOTAL_SUFFIX = '이에요';
export const SEARCHING_COPY = '찾고 있어요';
export const CONNECTION_CHECKING_LABEL = '확인하고 있어요';
export const CONNECTION_CHECKING_COPY = '연결을 확인하고 있어요.';
export const CONNECTION_CHECK_AGAIN = '다시 확인할게요';
export const CONNECTION_FAILED_COPY = '연결 상태를 확인하지 못했어요.';

export const GREETING_MORNING = '좋은 아침이에요';
export const GREETING_DAY = '오늘도 퇴근각이에요';
export const GREETING_EVENING = '이제 퇴근할 시간이에요';
export const GREETING_NIGHT = '오늘 하루 수고했어요';

export function accountIdentityLabel(user: Pick<SessionUser, 'email' | 'authProvider'>): string {
	return accountIdentityCopy(user.email, user.authProvider, {
		google: ACCOUNT_GOOGLE_LABEL,
		email: ACCOUNT_EMAIL_LABEL
	});
}

export function greetingCopy(now = new Date()): string {
	const hour = now.getHours();

	if (hour >= 5 && hour < 11) {
		return GREETING_MORNING;
	}

	if (hour >= 11 && hour < 17) {
		return GREETING_DAY;
	}

	if (hour >= 17 && hour < 22) {
		return GREETING_EVENING;
	}

	return GREETING_NIGHT;
}

export function homeOriginCopy(originName: string): string {
	return `출발지는 ${withIeYaCopula(originName)}`;
}

export function resultArrivalCopy(lineLabel: string | null, arrivalClock: string): string {
	if (lineLabel) {
		return `${lineLabel} 타고 ${arrivalClock}에 도착해요`;
	}

	return `${arrivalClock}에 도착해요`;
}

export function resultSavedCopy(savedSeconds: number): string {
	if (savedSeconds <= 0) {
		return '';
	}

	return `이 길을 고르면 ${formatSavedDuration(savedSeconds)} 일찍 도착해요`;
}

export function calculateLoadingCopy(stage: RecommendProgressStage | null): string {
	switch (stage) {
		case 'searchingRoutes':
			return LOADING_SEARCHING_ROUTES;
		case 'routesFound':
			return LOADING_ROUTES_FOUND;
		case 'timingRoutes':
			return LOADING_TIMING_ROUTES;
		case 'aiPicking':
			return LOADING_AI_PICKING;
		default:
			return RESULT_LOADING_COPY;
	}
}

export function standupLeadOptionLabel(minutes: number): string {
	if (minutes === 0) {
		return PUSH_LEAD_AT_STANDUP_LABEL;
	}

	return `${minutes}${PUSH_LEAD_BEFORE_SUFFIX}`;
}

export function criterionLabel(criterion: DisplayCriterion): string {
	switch (criterion) {
		case 'earliestArrival':
			return CRITERION_EARLIEST_ARRIVAL;
		case 'shortestDuration':
			return CRITERION_SHORTEST_DURATION;
		case 'leastWalking':
			return CRITERION_LEAST_WALKING;
		case 'fewestTransfers':
			return CRITERION_FEWEST_TRANSFERS;
		case 'aiPick':
			return CRITERION_AI_PICK;
		case 'latestDeparture':
			return ARRIVE_BY_RESULT_HELPER;
	}
}

const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;
const HANGUL_BATCHIM_MODULUS = 28;

function withIeYaCopula(word: string): string {
	const lastCharacter = word.at(-1);

	if (!lastCharacter) {
		return `${word}이에요`;
	}

	const code = lastCharacter.charCodeAt(0);

	if (code < HANGUL_SYLLABLE_START || code > HANGUL_SYLLABLE_END) {
		return `${word}이에요`;
	}

	const hasBatchim = (code - HANGUL_SYLLABLE_START) % HANGUL_BATCHIM_MODULUS !== 0;
	return hasBatchim ? `${word}이에요` : `${word}예요`;
}
