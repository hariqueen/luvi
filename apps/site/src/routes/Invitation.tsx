/**
 * B2 모바일 청첩장 소개.
 *
 * 기능을 카드로 나열합니다. 순서는 하객이 실제로 마주치는 순서가 아니라
 * **신랑신부가 궁금해하는 순서**입니다 — 방명록·계좌·지도가 먼저 오고 연출이 뒤에 옵니다.
 *
 * 미니게임 카드만 크림색으로 띄웁니다. 다른 곳에 없는 항목이라 목록에 섞이면 묻힙니다.
 */
import { Link } from 'react-router-dom';
import { useReveal } from '@/lib/reveal';
import { ScreenHeading } from './_ScreenHeading';

const FEATURES = [
  {
    title: '방명록',
    body: '하객 축하 메시지. 욕설·광고는 신랑신부가 직접 숨기거나 지웁니다.',
  },
  {
    title: '마음 전하기',
    body: '신랑측·신부측 계좌 아코디언, 번호 복사, 카카오페이 송금.',
  },
  { title: '오시는 길', body: '지도 임베드, 주소 복사, 카카오맵·네이버맵, 교통편 안내.' },
  {
    title: 'D-day & 캘린더',
    body: '예식일 강조 달력과 실시간 카운트다운, 구글 캘린더 일정 등록.',
  },
  { title: '갤러리', body: '대표 사진 + 썸네일 그리드, 탭하면 스와이프 라이트박스.' },
  { title: '배경음악 & 꽃잎', body: '음원 업로드와 낙하 연출. 각각 켜고 끌 수 있습니다.' },
  {
    title: '카톡 공유',
    body: (
      <>
        미리보기 카드와 <span className="text-ink">청첩장 보기</span>·
        <span className="text-ink">일정 등록</span> 버튼.
      </>
    ),
  },
  {
    title: '커스텀 미니게임',
    body: '우리 반려동물이 캐릭터가 되는 게임과 실시간 랭킹 TOP 7.',
    highlight: true,
  },
] as const;

export default function Invitation() {
  useReveal();

  return (
    <section className="border-t border-line bg-white">
      <div
        data-reveal
        className="mx-auto max-w-page px-[clamp(16px,3vw,28px)] py-[clamp(56px,7vw,96px)]"
      >
        <ScreenHeading
          label="MOBILE"
          title="모바일 청첩장"
          desc="만들고 바로 배포합니다. 아래 기능은 전부 기본으로 들어 있고, 필요 없는 섹션은 빼면 됩니다."
        />

        <ul className="grid grid-cols-[repeat(auto-fit,minmax(232px,1fr))] gap-3.5">
          {FEATURES.map((f) => (
            <li
              key={f.title}
              className={`rounded-2xl border p-6 ${
                'highlight' in f && f.highlight
                  ? 'border-[#EEDFC7] bg-cream'
                  : 'border-[#EAE5DC] bg-white'
              }`}
            >
              <h2 className="mb-[7px] text-[15px] font-semibold">{f.title}</h2>
              <p className="m-0 text-[13px] leading-[1.7] text-muted">{f.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-11 flex flex-wrap gap-2.5">
          <Link
            to="/app/new"
            className="rounded-full bg-ink px-[26px] py-[13px] text-[13.5px] text-paper-soft"
          >
            무료로 만들기
          </Link>
          <Link
            to="/samples"
            className="rounded-full border border-line-strong bg-white px-[22px] py-[13px] text-[13.5px]"
          >
            템플릿 먼저 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
