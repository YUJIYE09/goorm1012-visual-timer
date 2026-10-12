import { describe, expect, it } from "vitest";
import {
  FULL_MS,
  formatTime,
  minutesFromAngle,
  remainingAt,
  sweepDegrees,
} from "../src/timer-logic.js";

describe("formatTime", () => {
  it("분:초 형식으로 표시한다", () => {
    expect(formatTime(600_000)).toBe("10:00");
    expect(formatTime(1_000)).toBe("0:01");
    expect(formatTime(0)).toBe("0:00");
  });

  it("초를 올림해서 아직 남은 시간이 0:00으로 보이지 않게 한다", () => {
    expect(formatTime(59_001)).toBe("1:00");
    expect(formatTime(500)).toBe("0:01");
  });
});

describe("minutesFromAngle (시계 방향, 12시 = 0분 기준)", () => {
  it("명세 예시대로 3시 = 15분, 6시 = 30분, 9시 = 45분이다", () => {
    expect(minutesFromAngle(90, false)).toBe(15);
    expect(minutesFromAngle(180, false)).toBe(30);
    expect(minutesFromAngle(270, false)).toBe(45);
  });

  it("12시 방향은 60분이다", () => {
    expect(minutesFromAngle(0, false)).toBe(60);
    expect(minutesFromAngle(359.9, false)).toBe(60);
  });

  it("Shift 스냅 시 5분 단위로 맞춘다", () => {
    expect(minutesFromAngle(100, true)).toBe(15);
    expect(minutesFromAngle(270, true)).toBe(45);
  });
});

describe("sweepDegrees", () => {
  it("60분은 한 바퀴(360°)다", () => {
    expect(sweepDegrees(FULL_MS)).toBe(360);
  });

  it("30분은 6시 방향(180°)이다", () => {
    expect(sweepDegrees(30 * 60_000)).toBe(180);
  });

  it("0 이하이면 0°를 반환한다", () => {
    expect(sweepDegrees(0)).toBe(0);
    expect(sweepDegrees(-5_000)).toBe(0);
  });
});

describe("remainingAt", () => {
  it("종료 시각 기준으로 남은 시간을 계산한다", () => {
    expect(remainingAt(70_000, 10_000)).toBe(60_000);
  });

  it("종료 시각이 지나면 0을 반환한다", () => {
    expect(remainingAt(10_000, 12_345)).toBe(0);
  });
});
