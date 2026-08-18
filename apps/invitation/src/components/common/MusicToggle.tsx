/**
 * 우상단 배경음악 토글 (재생 시 이퀄라이저, 정지 시 ▶).
 *
 * `tone` 은 버튼이 놓이는 배경 밝기입니다 — classic1 은 커버 사진 위(어두움),
 * classic2 는 아이보리 여백 위(밝음)라서 같은 색으로 두면 한쪽에서 안 보입니다.
 */

interface MusicToggleProps {
  musicOn: boolean;
  onToggle: () => void;
  /** 'dark' = 어두운 버튼(기본, 사진 위) · 'light' = 밝은 버튼(밝은 배경 위) */
  tone?: 'dark' | 'light';
}

const EQ_DELAYS = [0, 0.22, 0.44, 0.15];

export function MusicToggle({ musicOn, onToggle, tone = 'dark' }: MusicToggleProps) {
  const light = tone === 'light';
  return (
    <button
      onClick={onToggle}
      title="배경음악"
      aria-label="배경음악 켜기/끄기"
      className={`fixed top-3.5 z-[70] flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-full backdrop-blur-md ${
        light ? 'border border-c2-line' : 'border-none'
      }`}
      style={{
        right: 'max(14px, calc((100vw - 430px) / 2 + 14px))',
        background: light ? 'rgba(252,250,246,.78)' : 'rgba(40,32,28,.6)',
        boxShadow: light ? '0 4px 12px rgba(62,58,51,.12)' : '0 4px 12px rgba(0,0,0,.28)',
      }}
    >
      {musicOn ? (
        <span className="flex h-[15px] items-end gap-0.5">
          {EQ_DELAYS.map((d, i) => (
            <i
              key={i}
              className={`block h-full w-[3px] rounded-sm ${light ? 'bg-c2-sage-deep' : 'bg-white'}`}
              style={{
                transformOrigin: 'bottom',
                animation: `eq .9s ease-in-out ${d}s infinite`,
              }}
            />
          ))}
        </span>
      ) : (
        <svg width={16} height={16} viewBox="0 0 24 24" fill={light ? '#5E6B54' : '#fff'}>
          <polygon points="7 5 19 12 7 19" />
        </svg>
      )}
    </button>
  );
}
