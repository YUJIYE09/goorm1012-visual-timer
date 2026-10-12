// 타이머 계산 로직. DOM에 의존하지 않으므로 Vitest로 검증합니다.
// 기술명세서 6·7·8장의 규칙을 구현합니다.

export const MAX_MIN = 60;                 // 다이얼 한 바퀴 = 60분
export const FULL_MS = MAX_MIN * 60_000;

// 남은 시간(ms)을 "mm:ss" 형식으로 바꿉니다. 초는 올림해서 0:00이 너무 일찍 나오지 않게 합니다.
export function formatTime(ms) {
  const sec = Math.ceil(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// 12시 기준 시계 방향 각도를 분으로 바꿉니다. 1~60분으로 제한합니다.
// snap5가 true이면 5분 단위로 맞춥니다(Shift 드래그).
export function minutesFromAngle(deg, snap5) {
  let min = Math.round((deg / 360) * MAX_MIN);
  if (min === 0) min = MAX_MIN;
  if (snap5) min = Math.round(min / 5) * 5;
  return Math.min(MAX_MIN, Math.max(1, min));
}

// 남은 시간을 부채꼴 각도로 바꿉니다. 60분 = 360°이므로 설정 시간과 관계없이 눈금 위치가 같습니다.
export function sweepDegrees(remainingMs) {
  return Math.min(360, Math.max(0, (remainingMs / FULL_MS) * 360));
}

// 종료 시각 기준으로 남은 시간을 계산합니다. 탭 지연이나 렌더링 지연에도 오차가 쌓이지 않습니다.
export function remainingAt(endAt, now) {
  return Math.max(0, endAt - now);
}
