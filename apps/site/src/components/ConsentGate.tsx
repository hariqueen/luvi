/**
 * 약관 동의 화면 — 신규 가입과 재동의가 **같은 화면**을 씁니다.
 *
 * 문구만 다르고 구조가 같아서 나누면 한쪽만 고치게 됩니다(전체 동의 규칙, 필수 항목 목록,
 * 전문 링크가 전부 두 벌이 됩니다).
 *
 * ─── UI 규칙 (법정 권고) ────────────────────────────────────────
 *
 * 🔴 **"전체 동의" 가 선택 항목까지 끌고 들어가면 안 됩니다.** 마케팅 수신 동의는
 *    "동의한 줄 몰랐다" 가 그대로 분쟁이 되는 항목입니다. 그래서 전체 동의는 제공하되
 *    필수/선택을 시각적으로 갈라 두고, 사용자가 무엇에 동의하는지 보이게 합니다.
 *
 * 🔴 **선택 항목은 기본 미체크입니다.** 기본 체크 상태로 두고 받은 동의는 유효하지 않습니다.
 *
 * 🔴 **각 항목에서 전문을 볼 수 있어야 합니다.** 새 탭으로 엽니다 — 모달로 덮으면 체크
 *    상태를 유지하기 위한 상태 관리가 늘고, 긴 문서를 작은 상자에서 읽게 됩니다.
 */
import { useState } from 'react';
import {
  CONSENT_LABELS,
  OPTIONAL_CONSENTS,
  REQUIRED_CONSENTS,
  type ConsentDocType,
  type ConsentMethod,
} from '@luvi/schema';
import { api } from '@/lib/api';

/** 항목별 전문 링크. 나이 확인은 문서가 따로 없습니다 */
const DOC_LINK: Partial<Record<ConsentDocType, string>> = {
  terms: '/terms',
  privacy: '/privacy',
  marketing: '/privacy',
};

interface Props {
  /** 'signup' 이면 첫 가입, 'reconsent' 면 개정된 문서에 다시 받는 것 */
  method: Extract<ConsentMethod, 'signup' | 'reconsent'>;
  /** 재동의에서 어떤 항목이 비었는지 — 안내 문구에만 씁니다 */
  missing?: ConsentDocType[];
  onDone: () => void;
  /** 재동의를 미루고 나갈 때. 없으면 버튼을 숨깁니다 */
  onCancel?: () => void;
}

export function ConsentGate({ method, missing = [], onDone, onCancel }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = [...REQUIRED_CONSENTS];
  const optional = [...OPTIONAL_CONSENTS];
  const allRequiredChecked = required.every((t) => checked[t]);

  const toggle = (t: ConsentDocType) => setChecked((c) => ({ ...c, [t]: !c[t] }));

  /** 전체 동의 — 켤 때는 선택 항목까지 포함하지만, 그 사실이 화면에 보입니다 */
  const allChecked = [...required, ...optional].every((t) => checked[t]);
  const toggleAll = () => {
    const next = !allChecked;
    setChecked(Object.fromEntries([...required, ...optional].map((t) => [t, next])));
  };

  async function submit() {
    if (!allRequiredChecked || saving) return;
    setSaving(true);
    setError(null);

    const res = await api.consents.submit({
      method,
      items: [...required, ...optional].map((docType) => ({
        docType,
        agreed: Boolean(checked[docType]),
      })),
    });

    setSaving(false);
    if (res.ok) onDone();
    else setError(res.error.message);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col justify-center px-6 py-10">
      <span className="font-script text-[30px] text-gold">Luvi</span>

      <h1 className="mt-4 text-[19px] font-semibold leading-snug text-ink">
        {method === 'signup' ? '시작하기 전에 동의가 필요해요' : '약관이 개정되었습니다'}
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        {method === 'signup'
          ? '필수 항목에 동의하시면 청첩장을 만들 수 있어요.'
          : '변경된 내용에 동의하시면 이어서 이용하실 수 있어요. 이미 발행한 청첩장은 하객에게 그대로 보입니다.'}
      </p>

      {method === 'reconsent' && missing.length > 0 && (
        <p className="mt-2 text-[12px] text-muted">
          다시 확인이 필요한 항목: {missing.map((m) => CONSENT_LABELS[m]).join(' · ')}
        </p>
      )}

      {/* 전체 동의 — 아래 목록과 시각적으로 분리합니다 */}
      <label className="mt-7 flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={toggleAll}
          className="h-[18px] w-[18px] accent-gold"
        />
        <span className="text-[14px] font-semibold text-ink">전체 동의</span>
        <span className="ml-auto text-[11.5px] text-muted">선택 항목 포함</span>
      </label>

      <div className="mt-5 space-y-1">
        <p className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">필수</p>
        {required.map((t) => (
          <Row key={t} type={t} checked={Boolean(checked[t])} onToggle={() => toggle(t)} required />
        ))}
      </div>

      {optional.length > 0 && (
        <div className="mt-5 space-y-1">
          <p className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">선택</p>
          {optional.map((t) => (
            <Row key={t} type={t} checked={Boolean(checked[t])} onToggle={() => toggle(t)} />
          ))}
          <p className="pl-1 pt-1 text-[11.5px] leading-relaxed text-muted">
            동의하지 않아도 서비스를 이용하실 수 있고, 나중에 계정 설정에서 언제든 철회할 수
            있어요.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!allRequiredChecked || saving}
        className="mt-7 h-12 rounded-xl bg-ink text-[14px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
      >
        {saving ? '저장하는 중…' : '동의하고 계속하기'}
      </button>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 h-10 text-[12.5px] text-muted underline underline-offset-2"
        >
          나중에 하기
        </button>
      )}
    </main>
  );
}

function Row({
  type,
  checked,
  onToggle,
  required = false,
}: {
  type: ConsentDocType;
  checked: boolean;
  onToggle: () => void;
  required?: boolean;
}) {
  const href = DOC_LINK[type];
  return (
    <div className="flex items-center gap-3 py-1.5">
      <label className="flex flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="h-[17px] w-[17px] accent-gold"
        />
        <span className="text-[13.5px] text-ink">
          <span className="text-muted">[{required ? '필수' : '선택'}]</span> {CONSENT_LABELS[type]}
        </span>
      </label>
      {href && (
        // 새 탭 — 모달로 덮으면 체크 상태 관리가 늘고 긴 문서를 작은 상자에서 읽게 됩니다
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="shrink-0 text-[11.5px] text-muted underline underline-offset-2 hover:text-ink"
        >
          전문 보기
        </a>
      )}
    </div>
  );
}
