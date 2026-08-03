/**
 * C8 청첩장 인계 (클레임).
 *
 * 코드가 맞아도 바로 넘기지 않습니다 — 어떤 청첩장인지 보여주고 확인받습니다.
 * 엉뚱한 청첩장을 가져가는 사고를 막는 장치입니다.
 */
import { useState } from 'react';

/** 입력 편의: 대문자 변환 + 하이픈 자동 삽입 (LUVI-XXXX-XXXX) */
function formatCode(raw: string): string {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = s.startsWith('LUVI') ? s.slice(4) : s;
  const parts = ['LUVI', body.slice(0, 4), body.slice(4, 8)].filter(Boolean);
  return parts.join('-');
}

export default function Claim() {
  const [code, setCode] = useState('');
  const ready = /^LUVI-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);

  return (
    <div className="mx-auto max-w-[440px] py-6">
      <h1 className="text-[22px] font-semibold tracking-[-.03em]">청첩장 받기</h1>
      <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
        전달받은 코드를 입력하면 이미 만들어진 청첩장을 직접 수정할 수 있습니다.
        하객에게 공유한 링크는 그대로 유지됩니다.
      </p>

      <input
        value={code}
        onChange={(e) => setCode(formatCode(e.target.value))}
        placeholder="LUVI-XXXX-XXXX"
        inputMode="text"
        autoCapitalize="characters"
        spellCheck={false}
        className="mt-6 h-[54px] w-full rounded-xl border border-line-strong bg-white px-4 text-center tracking-[.12em] outline-none focus:border-gold"
      />

      <button
        type="button"
        disabled={!ready}
        className="mt-3 h-[52px] w-full rounded-xl bg-ink text-[14px] text-paper-soft disabled:opacity-40"
      >
        확인
      </button>
    </div>
  );
}
