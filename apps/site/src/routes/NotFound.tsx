import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="font-script text-[40px] text-gold">Oops</span>
      <p className="text-sm text-muted">주소가 잘못되었거나 사라진 페이지입니다.</p>
      <Link to="/" className="rounded-full bg-ink px-5 py-2.5 text-[12.5px] text-paper-soft">
        홈으로
      </Link>
    </section>
  );
}
