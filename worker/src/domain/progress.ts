import { STEP_INTERVAL_MS } from "../config/constants";

export interface Progress {
  /** 開始からの経過時間で清掃済みになっているマス数（0 以上・総数以下）。 */
  reachedSteps: number;
  /** 全マスを清掃し終えた時刻を過ぎているか。 */
  finished: boolean;
}

/**
 * Python 版のバックグラウンド・シミュレーションと同じ時刻規則で進捗を求める。
 * 1 マス目は開始時刻に清掃し、以後 STEP_INTERVAL_MS ごとに 1 マス進む。
 * 最終マスの後にも 1 ステップ待ってから完了するため、完了時刻は総数 × STEP_INTERVAL_MS。
 */
export function computeProgress(elapsedMs: number, totalSteps: number): Progress {
  if (totalSteps === 0) {
    return { reachedSteps: 0, finished: true };
  }
  const elapsed = Math.max(0, elapsedMs);
  return {
    reachedSteps: Math.min(totalSteps, Math.floor(elapsed / STEP_INTERVAL_MS) + 1),
    finished: elapsed >= totalSteps * STEP_INTERVAL_MS,
  };
}
