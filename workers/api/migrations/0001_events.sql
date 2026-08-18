-- 사용자 이벤트 로그 (D1).
--
-- 왜 D1 인가: 보관 기간을 우리가 정해야 하고("2주 뒤 리셋"), 문의가 들어왔을 때
-- "누가 언제 무엇을 눌러 무엇이 실패했나" 를 SQL 로 바로 훑어야 한다.
-- KV 는 하루 1,000 쓰기 한도라 이벤트 로그로 못 쓰고, Analytics Engine 은 보관이 90일 고정이다.
--
-- 개인정보를 최소로 둡니다:
--   · 이름·이메일·전화번호는 절대 넣지 않습니다 (방명록 이름조차 넣지 않습니다)
--   · IP 는 원문 대신 해시만 (같은 사람인지 구분만 되게)
--   · session 은 탭 단위 난수 — 사람을 식별하지 않고 한 번의 방문을 잇는 용도

CREATE TABLE IF NOT EXISTS events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  -- ISO8601 UTC. 문자열 비교만으로 정렬·기간 삭제가 되므로 TEXT 로 둡니다
  at            TEXT NOT NULL,
  -- 'click' | 'error' | 'view'
  kind          TEXT NOT NULL,
  -- 'kakao_share' | 'draft_save' | 'publish' 같은 지점 이름
  name          TEXT NOT NULL,
  -- 1 성공 / 0 실패 / NULL 해당 없음
  ok            INTEGER,
  -- 실패 사유·에러 메시지 (앞 500자)
  detail        TEXT,
  invitation_id TEXT,
  slug          TEXT,
  session       TEXT,
  -- 로그인 사용자(에디터 쪽). 하객은 NULL
  uid           TEXT,
  path          TEXT,
  ua            TEXT,
  ip_hash       TEXT
);

-- 기간 삭제(cron)와 최신순 조회가 가장 흔한 질의입니다
CREATE INDEX IF NOT EXISTS idx_events_at ON events (at);
-- "카카오 공유 실패만" 처럼 지점별로 좁혀 보는 질의
CREATE INDEX IF NOT EXISTS idx_events_name_at ON events (name, at);
