/** 화면 위로 떨어지는 꽃잎/발자국 연출 (petalFall 키프레임은 index.css) */
import type { CSSProperties } from 'react';

interface Petal {
  kind: 'img' | 'paw';
  left: string;
  size: number;
  duration: number;
  delay: number;
}

const PETALS: Petal[] = [
  { kind: 'img', left: '5%', size: 40, duration: 11, delay: 0 },
  { kind: 'paw', left: '15%', size: 20, duration: 9, delay: -3 },
  { kind: 'img', left: '33%', size: 30, duration: 13.5, delay: -2 },
  { kind: 'paw', left: '44%', size: 25, duration: 8.5, delay: -5 },
  { kind: 'img', left: '54%', size: 46, duration: 10, delay: -1.5 },
  { kind: 'paw', left: '64%', size: 17, duration: 11.5, delay: -7 },
  { kind: 'img', left: '82%', size: 34, duration: 12.5, delay: -2.5 },
  { kind: 'paw', left: '90%', size: 23, duration: 8, delay: -6.5 },
  { kind: 'img', left: '11%', size: 26, duration: 15, delay: -11 },
];

const DROP_SHADOW = 'drop-shadow(0 2px 3px rgba(0,0,0,.18))';

interface PetalsProps {
  image: string;
}

export function Petals({ image }: PetalsProps) {
  return (
    <div className="pointer-events-none fixed inset-0 left-1/2 z-[60] max-w-page -translate-x-1/2 overflow-hidden">
      {PETALS.map((p, i) => {
        const style: CSSProperties = {
          position: 'absolute',
          left: p.left,
          top: p.kind === 'img' ? '-8%' : '-6%',
          animation: `petalFall ${p.duration}s linear ${p.delay}s infinite`,
        };
        return p.kind === 'img' ? (
          <img
            key={i}
            src={image}
            alt=""
            style={{ ...style, width: p.size, filter: DROP_SHADOW }}
          />
        ) : (
          <span key={i} style={{ ...style, fontSize: p.size }}>
            🐾
          </span>
        );
      })}
    </div>
  );
}
