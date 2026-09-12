# 퇴근각

성남에서 서울로 퇴근할 때, **이 시각 이후 가장 빨리 도착하는 경로**를 추천하는 SPA입니다.

카카오 대중교통 경로는 경로의 형태만 쓰고, 시각은 GTFS 정적 시각표로 다시 계산합니다.

## 스택

- TypeScript, Vite, SvelteKit (`@sveltejs/adapter-vercel`)
- 1차 배포: **Vercel Functions + Supabase Postgres**. Fly는 이후 고도화입니다.
- 계정·기록: Postgres (`DATABASE_URL`). 로그인은 **Supabase Auth**. 로컬만 키가 없으면 PGlite(프로필 테스트용, 실제 로그인 아님)
- 장소 검색: Kakao Maps JavaScript SDK
- 경로: Kakao REST `publictraffic` (서버 전용 키)
- 시각표: `DATABASE_URL`이 있으면 Supabase `gtfs_*`만 씁니다. 키가 없을 때만 로컬 `GTFS_DIR` CSV / PGlite
- 알림: 웹 푸시(VAPID). 로컬 Node는 `setInterval`, Vercel은 Cron

API 키는 저장소에 넣지 않습니다. REST 키는 브라우저에 노출하지 않습니다. 브라우저는 GTFS를 받지 않습니다.

## 시작하기

```sh
npm install
cp .env.example .env
```

`.env`에 키를 넣은 뒤:

```sh
npm run dev
```

카카오 콘솔의 JavaScript SDK 도메인에 개발 주소와 배포 주소를 등록하세요. `http://` 또는 `https://`를 포함한 호스트:포트가 필요합니다. 예: `http://localhost:5174`. Vercel 프로젝트 `toegeun-gak-app`(팀 noname-8398)은 `https://toegeun-gak-app.vercel.app`과 미리보기 호스트(`https://toegeun-gak-app-git-cursor-gtfs-csv-schema-s-a9b2cd-noname-8398.vercel.app` 등)를 각각 넣습니다. 와일드카드가 안 되면 URL을 각각 넣습니다.

## 환경 변수

| 이름                       | 위치     | 역할                                                                                         |
| -------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `PUBLIC_KAKAO_JS_KEY`      | 브라우저 | 장소 검색. 없으면 Mock 장소를 씁니다.                                                        |
| `KAKAO_REST_API_KEY`       | 서버만   | 대중교통 경로. `PUBLIC_` 접두사 금지. 없으면 Mock 경로를 씁니다.                             |
| `GTFS_DIR`                 | 로컬만   | 압축 푼 GTFS 폴더. 비우면 `./data/gtfs-seoul-seongnam`. **Vercel에는 넣지 마세요.**          |
| `DATABASE_URL`             | 서버만   | Postgres. 앱은 트랜잭션 풀러 `:6543`. COPY 적재는 세션 `:5432`. Vercel 필수. `PUBLIC_` 금지. |
| `PUBLIC_SUPABASE_URL`      | 브라우저 | Auth 프로젝트 URL. `https://xxxx.supabase.co`. 로그인·가입·OAuth에 필요합니다.               |
| `PUBLIC_SUPABASE_ANON_KEY` | 브라우저 | Auth anon/publishable 키. `service_role` 금지.                                               |
| `VAPID_PUBLIC_KEY`         | 서버만   | 웹 푸시 공개키. 클라이언트는 `/api/push/vapid`로만 받습니다.                                 |
| `VAPID_PRIVATE_KEY`        | 서버만   | 웹 푸시 비밀키. `PUBLIC_` 금지.                                                              |
| `VAPID_SUBJECT`            | 서버만   | 웹 푸시 `mailto:` 또는 `https:` 연락처.                                                      |
| `CRON_SECRET`              | 서버만   | Vercel Cron이 `Authorization: Bearer`로 보냅니다. 기동 시 `setInterval` 푸시는 끕니다.       |

상대 경로는 개발 서버를 켠 폴더 기준입니다. 안 읽히면 절대 경로를 쓰세요.

## 1차 배포 (Vercel + Supabase)

1. Supabase SQL 에디터에 [`sql/schema.sql`](sql/schema.sql)을 **배포 전에** 적용합니다. 앱은 Vercel에서 `CREATE IF NOT EXISTS`를 돌리지 않습니다. 이 파일은 유저 테이블을 지우고 `users.id`를 `auth.users.id`와 맞춥니다. GTFS는 유지합니다.
2. GitHub 저장소 루트가 이미 앱입니다. Vercel **Root Directory는 비웁니다.** (로컬 폴더 이름이 `dev/`여도 원격에는 `dev/dev`가 없습니다.) Env에 `DATABASE_URL`(트랜잭션 풀러 `:6543`), `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `KAKAO_REST_API_KEY`, `PUBLIC_KAKAO_JS_KEY`, `VAPID_*`, `CRON_SECRET`을 넣습니다. `GTFS_DIR`은 넣지 않습니다. 함수 런타임은 Node 22입니다.
3. 로컬에서 피드를 푼 뒤 **서울·성남 슬라이스**만 DB에 올립니다. 전체 `stop_times`를 넣지 마세요.

```sh
npm run gtfs:filter-seoul-seongnam   # 선택. 원본 ./data/gtfs → ./data/gtfs-seoul-seongnam
export DATABASE_URL='postgresql://...:5432/postgres'   # COPY는 세션 풀러
export GTFS_DIR='./data/gtfs-seoul-seongnam'
npm run gtfs:load-slice
```

zip·원본 피드는 git과 Vercel 함수 디스크에 올리지 마세요.

`vercel.json` Cron은 **매일 23:00 UTC**(한국 시간 다음날 08:00)에 `GET /api/cron/standup`을 호출합니다. Hobby는 하루 한 번만 허용해서 1분 간격은 쓰지 않습니다. 헤더는 `Authorization: Bearer ${CRON_SECRET}`입니다.

추천 API `maxDuration`은 Hobby 한도(10초)입니다. 카카오+SQL이 길면 Pro에서 올립니다.

## GTFS

전국 피드 zip은 저장소에 넣지 마세요. zip을 직접 풀고, 프로덕션은 적재 스크립트로 슬라이스만 Supabase에 둡니다.

로컬 파일 시각표 기본 경로는 `./data/gtfs-seoul-seongnam`입니다. `./data/gtfs`는 필터 원본입니다. 둘 다 gitignore됩니다. 단위 테스트는 `src/lib/adapters/gtfs/fixtures/simple/`만 씁니다.

`data/raw/`의 작은 CSV는 참고용입니다. 파일 시각표는 `GTFS_DIR`의 `routes.txt`, `stops.txt`, `trips.txt`, `stop_times.txt`, `calendar.txt`입니다.

서버가 고르는 순서: `DATABASE_URL`이 있으면 SQL만 씁니다(슬라이스가 비면 로컬 CSV로 넘어가지 않습니다). 키가 없을 때만 `GTFS_DIR` CSV → 없으면 빈 시각표/Mock.

## 스크립트

```sh
npm run dev              # 개발 서버
npm test                 # Vitest 한 번
npm run check            # svelte-check
npm run lint             # Prettier + ESLint
npm run knip             # 미사용 파일·export
npm run ci               # check + lint + knip + test
npm run build            # Vercel용 빌드
npm run preview          # 빌드 미리보기
npm run gtfs:filter-seoul-seongnam  # 원본 GTFS → 서울·성남 슬라이스
npm run gtfs:load-slice             # 슬라이스 CSV → DATABASE_URL
```

## 동작 요약

1. 홈에서 목적지와 퇴근 가능 시각(이 시각 이후)을 고릅니다.
2. 서버가 Kakao로 경로 형태를 찾고, 각 경로를 GTFS 정적 시각표로 다시 계산합니다.
3. 결과 화면은 가장 빠른 도착 시각과 그 경로를 보여 줍니다.

키가 없으면 Mock으로 화면만 돌아갑니다. 실제 버스·지하철 시각표가 아닙니다.
