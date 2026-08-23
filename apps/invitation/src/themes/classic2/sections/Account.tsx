/**
 * 마음 전하기 (classic2) — 신랑측·신부측 아코디언.
 *
 * 계좌번호는 **복사 버튼**으로만 건넵니다 (하객이 손으로 옮겨 적다 틀리는 일을 막습니다).
 * 카카오페이 링크가 있으면 함께 보여줍니다 — 앱에서 바로 송금하는 사람이 많습니다.
 */
import { useState } from 'react';
import { useCopy } from '@/hooks/useCopy';
import { SectionText } from '../ui';
import { CheckIcon, CopyIcon } from '@/components/common/icons';
import { useInvitation } from '@/lib/invitationContext';
import { BASE } from '@/lib/env';
import { Field } from '@/components/common/Editable';

const KAKAOPAY_ICON = `${BASE}assets/kakaopay_icon.png`;

export function Account() {
  const { account, sectionText } = useInvitation();
  const text = sectionText.account;
  const { copy, isCopied } = useCopy();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="bg-white px-[30px] py-[60px] text-center">
      <SectionText section="account" zone="head" blocks={text.head} />

      <p className="mx-auto mt-6 mb-6 max-w-[290px] whitespace-pre-line font-myeongjo text-[13px] leading-[1.9] text-c2-ink-soft">
        <Field path="core.account.description" value={account.description} />
      </p>

      <div className="flex flex-col gap-2.5">
        {account.groups.map((group, gi) => {
          const open = openIndex === gi;
          return (
            <div key={gi} className="overflow-hidden border border-c2-line bg-c2-ivory">
              <button
                onClick={() => setOpenIndex(open ? null : gi)}
                className="flex w-full items-center justify-between border-none bg-transparent px-[18px] py-[15px] font-myeongjo text-[14px] text-c2-ink"
              >
                <span>
                  <Field path={`core.account.groups.${gi}.title`} value={group.title} />
                </span>
                <span
                  className="mt-[-3px] inline-block size-2 border-b border-r border-c2-ink-soft transition-transform duration-[250ms]"
                  style={{ transform: open ? 'rotate(-135deg)' : 'rotate(45deg)' }}
                />
              </button>

              {open && (
                <div className="flex flex-col gap-2 px-[18px] pb-[18px]">
                  {group.items.map((item, ii) => {
                    const key = `${gi}-${ii}`;
                    return (
                      <div
                        key={ii}
                        className="flex items-center justify-between gap-2.5 border border-c2-line bg-white px-3.5 py-3 text-left"
                      >
                        <div className="min-w-0">
                          <div className="font-myeongjo text-[13px] text-c2-ink">
                            <Field
                              path={`core.account.groups.${gi}.items.${ii}.label`}
                              value={item.label}
                            />
                          </div>
                          {/* 복사에 쓰이는 값은 `number` 라 여기서 고쳐도 복사가 깨지지 않습니다 */}
                          <div className="mt-0.5 font-mono text-[12px] text-c2-ink-soft">
                            <Field
                              path={`core.account.groups.${gi}.items.${ii}.bank`}
                              value={item.bank}
                            />
                          </div>
                        </div>
                        <div className="flex flex-none items-center gap-1.5">
                          <button
                            onClick={() => copy(item.number, key)}
                            title="계좌번호 복사"
                            className="flex size-8 items-center justify-center border-none bg-transparent p-0 text-c2-ink-soft"
                          >
                            {isCopied(key) ? <CheckIcon /> : <CopyIcon />}
                          </button>
                          {item.kakaoPay && (
                            <a
                              href={item.kakaoPay}
                              target="_blank"
                              rel="noopener"
                              title="카카오페이 송금"
                              className="flex h-8 items-center justify-center bg-transparent p-0 no-underline"
                            >
                              <img
                                src={KAKAOPAY_ICON}
                                alt="카카오페이 송금"
                                className="block h-4 w-auto"
                              />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SectionText section="account" zone="foot" blocks={text.foot} className="mt-8" />
    </section>
  );
}
