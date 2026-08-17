/**
 * 청첩장 데이터를 트리 전체에 나눠줍니다.
 *
 * 예전에는 `invitation.config.ts` 싱글턴을 각 섹션이 직접 import 했습니다 — 청첩장 1건만
 * 빌드할 수 있는 구조였죠. 이제 발행 스냅샷을 런타임에 받아 이 컨텍스트로 주입하므로,
 * 같은 빌드가 슬러그마다 다른 청첩장을 그립니다. 섹션은 `useInvitation()` 으로만 읽습니다.
 */
import { createContext, useContext } from 'react';
import type { InvitationConfig } from '@/config/invitation.config';

const InvitationContext = createContext<InvitationConfig | null>(null);

export const InvitationProvider = InvitationContext.Provider;

export function useInvitation(): InvitationConfig {
  const ctx = useContext(InvitationContext);
  if (!ctx) throw new Error('useInvitation 은 InvitationProvider 안에서만 쓸 수 있습니다');
  return ctx;
}
