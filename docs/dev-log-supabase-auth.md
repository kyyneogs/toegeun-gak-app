# 개발 로그: Supabase Auth 로그인

## 한 일

- 커스텀 scrypt 세션(`tgk_session` / `sessions` / `password_hash`)을 제거하고 **Supabase Auth**로 옮겼다.
- 이메일 가입은 인증 메일을 열기 전에는 로그인되지 않는다. `/auth/callback`에서 세션을 교환한다.
- 로그인·회원가입에 **Google로 시작하기**를 붙였다. 비밀번호 재설정은 `/auth/reset`.
- `public.users.id` = `auth.users.id`(UUID). 이메일은 nullable. Google은 이메일 없이 가입 가능하고, 설정에는 “Google 계정”을 보여 준다.
- 단위 테스트는 PGlite + `insertTestUser()`. 실제 로그인은 `PUBLIC_SUPABASE_*`가 있는 같은 프로젝트가 필요하다.

## 다음 작업 시

- 배포 전 [`sql/schema.sql`](../sql/schema.sql)을 SQL 에디터에 적용하고, Dashboard에서 `auth.users`도 비운다.
- Auth URL: Site URL + Redirect에 `https://toegeun-gak.vercel.app/auth/callback`, 프리뷰, `http://localhost:5174/auth/callback`. Confirm email ON (이메일 가입만).
- Google 제공자 키. Redirect는 `https://<project>.supabase.co/auth/v1/callback`.
- 카카오 **로그인**은 쓰지 않는다. 지도 JS키·대중교통 REST는 그대로.
- Google은 이메일 없이 될 수 있다. Provider에서 **Allow users without an email** ON.
- Vercel env: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` + 기존 `DATABASE_URL`. `service_role` 금지.
- PGlite와 cloud Auth를 섞지 않는다. 트리거가 프로필을 만들고, 실패하면 `ensureAppUser`가 upsert한다.
- 메일은 Supabase 내장. 한도·스팸함이 막히면 Dashboard Custom SMTP만 바꾼다.
