# 퇴근각

성남에서 서울로 퇴근할 때, **지금 나가면 되는 시각**을 추천하는 SPA입니다.

카카오 대중교통 경로(지금 경로)와 GTFS 정적 시각표(퇴근각 슬롯)를 같이 씁니다. GTFS가 없거나 노선이 안 맞으면 20분 추정 배차로 떨어집니다.

## 스택

- TypeScript, Vite, SvelteKit (`adapter-auto`)
- 장소 검색: Kakao Maps JavaScript SDK
- 경로: Kakao REST `publictraffic` (서버 전용 키)
- 시각표: 로컬 GTFS CSV (`GTFS_DIR`)

API 키는 저장소에 넣지 않습니다. REST 키는 브라우저에 노출하지 않습니다.

## 시작하기

```sh
npm install
cp .env.example .env
```

`.env`에 키를 넣은 뒤:

```sh
npm run dev
```

카카오 콘솔의 JavaScript SDK 도메인에 개발 주소를 등록하세요. `http://`를 포함한 호스트:포트가 필요합니다. 예: `http://localhost:5173`, `http://127.0.0.1:5174`.

## 환경 변수

| 이름 | 위치 | 역할 |
| --- | --- | --- |
| `PUBLIC_KAKAO_JS_KEY` | 브라우저 | 장소 검색. 없으면 Mock 장소를 씁니다. |
| `KAKAO_REST_API_KEY` | 서버만 | 대중교통 경로. `PUBLIC_` 접두사 금지. 없으면 Mock 경로를 씁니다. |
| `GTFS_DIR` | 서버만 | 압축 푼 GTFS 폴더. 없으면 퇴근각은 추정 배차입니다. |

상대 경로는 개발 서버를 켠 폴더 기준입니다. 안 읽히면 절대 경로를 쓰세요.

## GTFS

전국 피드 zip은 저장소에 넣지 마세요. zip을 직접 풀고 `GTFS_DIR`만 가리킵니다.

기본 로컬 경로는 `./data/gtfs`입니다. 이 폴더는 gitignore됩니다. 단위 테스트는 `src/lib/adapters/gtfs/fixtures/simple/`만 씁니다.

`data/raw/`의 작은 CSV는 참고용입니다. 런타임 시각표는 `GTFS_DIR`의 `routes.txt`, `stops.txt`, `trips.txt`, `stop_times.txt`, `calendar.txt`입니다.

## 스크립트

```sh
npm run dev      # 개발 서버
npm test         # Vitest 한 번
npm run check    # svelte-check
npm run lint     # Prettier + ESLint
npm run knip     # 미사용 파일·export
npm run ci       # check + lint + knip + test
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 미리보기
```

배포 환경에 맞게 [SvelteKit adapter](https://svelte.dev/docs/kit/adapters)를 바꾸면 됩니다.

## 동작 요약

1. 홈에서 목적지와 퇴근 가능 구간을 고릅니다.
2. 서버가 Kakao로 경로 위상을 한 번 찾고, 슬롯마다 GTFS(또는 추정)로 첫 승차 시각을 붙입니다.
3. 결과 화면은 추천 시각을 먼저 보여주고, 경로는 다음에 엽니다.

키가 없으면 Mock으로 화면만 돌아갑니다. 실제 버스·지하철 시각표가 아닙니다.
