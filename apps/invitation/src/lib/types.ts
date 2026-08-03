/** 방명록 한 줄 */
export interface GuestbookEntry {
  name: string;
  msg: string;
  ts: number;
}

/** 미니게임 랭킹 한 줄 */
export interface RankEntry {
  nick: string;
  score: number;
  caught?: number;
  ts: number;
}
