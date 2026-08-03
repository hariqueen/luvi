/** 갤러리 이미지 확대 보기 */

interface LightboxProps {
  src: string | null;
  onClose: () => void;
}

export function Lightbox({ src, onClose }: LightboxProps) {
  if (!src) return null;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[90] flex animate-fadeUp cursor-zoom-out items-center justify-center p-6"
      style={{ background: 'rgba(28,24,22,.9)' }}
    >
      <img
        src={src}
        alt=""
        className="max-h-[88vh] max-w-full rounded-lg"
        style={{ boxShadow: '0 20px 48px rgba(28,36,64,0.16)' }}
      />
    </div>
  );
}
