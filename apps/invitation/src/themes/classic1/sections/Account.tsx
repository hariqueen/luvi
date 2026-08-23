import { useState } from 'react';
import { useCopy } from '@/hooks/useCopy';
import { CheckIcon, CopyIcon } from '@/components/common/icons';
import { useInvitation } from '@/lib/invitationContext';
import { BASE } from '@/lib/env';
import { SectionText } from '../ui';
import { Field } from '@/components/common/Editable';

const KAKAOPAY_ICON = `${BASE}assets/kakaopay_icon.png`;

export function Account() {
  const { account, sectionText } = useInvitation();
  const text = sectionText.account;
  const { copy, isCopied } = useCopy();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="bg-cream px-7 py-[56px] text-center">
      <SectionText section="account" zone="head" blocks={text.head} />
      <p className="mx-auto mb-[22px] mt-1.5 max-w-[280px] whitespace-pre-line text-[13px] leading-[1.7] text-ink-soft">
        <Field path="core.account.description" value={account.description} />
      </p>

      <div className="flex flex-col gap-3">
        {account.groups.map((group, gi) => {
          const open = openIndex === gi;
          return (
            <div
              key={gi}
              className="overflow-hidden rounded-xl border border-line bg-white shadow-sm"
            >
              <button
                onClick={() => setOpenIndex(open ? null : gi)}
                className="flex w-full items-center justify-between border-none bg-transparent px-[18px] py-4 text-[15px] font-bold text-ink"
              >
                <span>
                  <Field path={`core.account.groups.${gi}.title`} value={group.title} />
                </span>
                <span
                  className="mt-[-3px] inline-block h-[9px] w-[9px] border-b border-r border-ink-soft transition-transform duration-[250ms]"
                  style={{ transform: open ? 'rotate(-135deg)' : 'rotate(45deg)' }}
                />
              </button>

              {open && (
                <div className="flex flex-col gap-2 px-[18px] pb-4">
                  {group.items.map((item, ii) => {
                    const key = `${gi}-${ii}`;
                    return (
                      <div
                        key={ii}
                        className="flex items-center justify-between gap-2.5 rounded-md bg-cream px-3.5 py-3 text-left"
                      >
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold text-ink">
                            <Field
                              path={`core.account.groups.${gi}.items.${ii}.label`}
                              value={item.label}
                            />
                          </div>
                          {/* 복사에 쓰이는 값은 `number` 라 여기서 고쳐도 복사가 깨지지 않습니다 */}
                          <div className="font-mono text-[12.5px] text-ink-soft">
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
                            className="flex h-9 w-9 items-center justify-center border-none bg-transparent p-0 text-ink-soft"
                          >
                            {isCopied(key) ? <CheckIcon /> : <CopyIcon />}
                          </button>
                          {item.kakaoPay && (
                            <a
                              href={item.kakaoPay}
                              target="_blank"
                              rel="noopener"
                              title="카카오페이 송금"
                              className="flex h-9 items-center justify-center bg-transparent p-0 no-underline"
                            >
                              <img
                                src={KAKAOPAY_ICON}
                                alt="카카오페이 송금"
                                className="block h-[17px] w-auto"
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

      <SectionText section="account" zone="foot" blocks={text.foot} className="mt-7" />
    </section>
  );
}
