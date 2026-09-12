-- 이미 있는 standup_jobs에 경로 요약을 붙입니다. 유저 테이블을 지우지 않습니다.
ALTER TABLE standup_jobs ADD COLUMN IF NOT EXISTS route JSONB;
