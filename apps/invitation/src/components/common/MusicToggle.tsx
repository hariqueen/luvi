/** 우상단 배경음악 토글 (재생 시 이퀄라이저, 정지 시 ▶) */

interface MusicToggleProps {
  musicOn: boolean;
  onToggle: () => void;
}

const EQ_DELAYS = [0, 0.22, 0.44, 0.15];

export function MusicToggle({ musicOn, onToggle }: MusicToggleProps) {
  return (
    <button
      onClick={onToggle}
      title="배경음악"
      aria-label="배경음악 켜기/끄기"
      className="fixed top-3.5 z-[70] flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-full border-none text-white backdrop-blur-md"
      style={{
        right: 'max(14px, calc((100vw - 430px) / 2 + 14px))',
        background: 'rgba(40,32,28,.6)',
        boxShadow: '0 4px 12px rgba(0,0,0,.28)',
      }}
    >
      {musicOn ? (
        <span className="flex h-[15px] items-end gap-0.5">
          {EQ_DELAYS.map((d, i) => (
            <i
              key={i}
              className="block h-full w-[3px] rounded-sm bg-white"
              style={{
                transformOrigin: 'bottom',
                animation: `eq .9s ease-in-out ${d}s infinite`,
              }}
            />
          ))}
        </span>
      ) : (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="#fff">
          <polygon points="7 5 19 12 7 19" />
        </svg>
      )}
    </button>
  );
}
