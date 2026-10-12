const { getCurrentWindow } = window.__TAURI__.window;
const win = getCurrentWindow();

// ---------- 상수 및 DOM ----------
const CX = 100, CY = 100, R = 92;   // 다이얼 중심과 반지름 (viewBox 기준)
const RIM = 100;                    // R~RIM 구간은 창 이동용 바깥 테두리
const MAX_MIN = 60;                 // 최대 설정 시간(분)

const dial = document.getElementById("dial");
const wedge = document.getElementById("wedge");
const ticksGroup = document.getElementById("ticks");
const readoutText = document.getElementById("readout-text");

// ---------- 설정 (localStorage 저장) ----------
const settings = JSON.parse(
  localStorage.getItem("vt-settings") ?? '{"sound":true,"onTop":true}'
);

function saveSettings() {
  localStorage.setItem("vt-settings", JSON.stringify(settings));
}

// ---------- 타이머 상태 ----------
const state = {
  totalMs: 10 * 60_000,
  remainingMs: 10 * 60_000,
  endAt: 0,
  running: false,
  finished: false,
};

// ---------- 좌표 유틸 ----------
function polar(deg, r = R) {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
}

function pointerPolar(e) {
  const rect = dial.getBoundingClientRect();
  const scale = 200 / rect.width;
  const x = (e.clientX - rect.left - rect.width / 2) * scale;
  const y = (e.clientY - rect.top - rect.height / 2) * scale;
  let deg = (Math.atan2(x, -y) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return { deg, dist: Math.hypot(x, y) };
}

// ---------- 시간 표시 ----------
function formatTime(ms) {
  const sec = Math.ceil(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function updateReadout() {
  const icon = state.running ? "❚❚" : "▶";
  readoutText.textContent = state.finished ? "완료" : `${icon} ${formatTime(state.remainingMs)}`;
}

// ---------- 그리기 ----------
// 60분을 한 바퀴(360°)로 고정합니다. 설정 시간과 관계없이 눈금 위치가 같습니다.
// 예: 30분 = 6시 방향, 45분 = 9시 방향
const FULL_MS = MAX_MIN * 60_000;

function drawWedge() {
  updateReadout();

  const sweep = Math.min(360, (state.remainingMs / FULL_MS) * 360);

  if (sweep <= 0) {
    wedge.setAttribute("d", "");
    return;
  }

  if (sweep >= 359.99) {
    wedge.setAttribute(
      "d",
      `M${CX} ${CY - R} A${R} ${R} 0 1 1 ${CX} ${CY + R} A${R} ${R} 0 1 1 ${CX} ${CY - R} Z`
    );
    return;
  }

  // 12시 방향에서 시계 방향으로 남은 각도만큼 부채꼴을 그립니다.
  const [sx, sy] = polar(0);
  const [ex, ey] = polar(sweep);
  const largeArc = sweep > 180 ? 1 : 0;

  wedge.setAttribute(
    "d",
    `M${CX} ${CY} L${sx.toFixed(2)} ${sy.toFixed(2)} ` +
    `A${R} ${R} 0 ${largeArc} 1 ${ex.toFixed(2)} ${ey.toFixed(2)} Z`
  );
}

function drawTicks() {
  const NS = "http://www.w3.org/2000/svg";
  for (let m = 0; m < MAX_MIN; m += 5) {
    const deg = (m / MAX_MIN) * 360;
    const [x1, y1] = polar(deg, R - 12);
    const [x2, y2] = polar(deg, R - 4);
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", x1.toFixed(2));
    line.setAttribute("y1", y1.toFixed(2));
    line.setAttribute("x2", x2.toFixed(2));
    line.setAttribute("y2", y2.toFixed(2));
    line.setAttribute("class", "tick");
    ticksGroup.appendChild(line);
  }
}

// ---------- 시간 설정 ----------
function setMinutesFromAngle(deg, snap5) {
  let min = Math.round((deg / 360) * MAX_MIN);
  if (min === 0) min = MAX_MIN;
  if (snap5) min = Math.round(min / 5) * 5;
  min = Math.min(MAX_MIN, Math.max(1, min));

  state.totalMs = min * 60_000;
  state.remainingMs = state.totalMs;
  state.finished = false;
  drawWedge();
}

// ---------- 타이머 제어 ----------
function start() {
  if (state.remainingMs <= 0) return;
  state.endAt = Date.now() + state.remainingMs;
  state.running = true;
}

function pause() {
  state.remainingMs = Math.max(0, state.endAt - Date.now());
  state.running = false;
}

function reset() {
  state.running = false;
  state.finished = false;
  state.remainingMs = state.totalMs;
  drawWedge();
}

function toggle() {
  if (state.finished || state.remainingMs <= 0) reset();
  state.running ? pause() : start();
}

function finish() {
  state.running = false;
  state.finished = true;
  state.remainingMs = 0;
  drawWedge();
  alertUser();
}

// ---------- 알림 ----------
function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.5, 1].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.2;
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.25);
    });
  } catch (err) {
    console.warn("알림음 재생 실패:", err);
  }
}

function alertUser() {
  if (settings.sound) beep();

  document.body.classList.add("alert");
  setTimeout(() => document.body.classList.remove("alert"), 2000);

  try {
    win.requestUserAttention(2);
  } catch (err) {
    console.warn("창 깜빡임 실패:", err);
  }
}

// ---------- 항상 위에 표시 ----------
async function setOnTop(value) {
  settings.onTop = value;
  saveSettings();
  await win.setAlwaysOnTop(value);
}

// ---------- 이벤트 ----------
// dragging: null | "dial"(시간 설정 중) | "knob"(노브 클릭 대기)
let dragging = null;

dial.addEventListener("pointerdown", (e) => {
  // 시작/정지 버튼 위에서 누른 경우에는 시간 설정이나 창 이동을 하지 않습니다.
  if (e.target.closest && e.target.closest("#readout")) return;

  const { deg, dist } = pointerPolar(e);

  // 바깥 테두리: 창 이동
  if (dist > R) {
    if (dist <= RIM) win.startDragging();
    return;
  }

  // 가운데 노브: 클릭하면 시작/일시정지
  if (dist < 14) {
    dragging = "knob";
    return;
  }

  // 다이얼 안쪽: 정지 상태일 때만 드래그로 시간 설정
  if (!state.running) {
    dragging = "dial";
    dial.setPointerCapture(e.pointerId);
    setMinutesFromAngle(deg, e.shiftKey);
  }
});

// 하단 시간 표시를 누르면 시작/정지
document.getElementById("readout").addEventListener("click", toggle);

dial.addEventListener("pointermove", (e) => {
  if (dragging !== "dial" || state.running) return;
  const { deg } = pointerPolar(e);
  setMinutesFromAngle(deg, e.shiftKey);
});

dial.addEventListener("pointerup", (e) => {
  if (dragging === "knob") toggle();
  dragging = null;
  dial.releasePointerCapture?.(e.pointerId);
});

dial.addEventListener("pointercancel", (e) => {
  dragging = null;
  dial.releasePointerCapture?.(e.pointerId);
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    toggle();
  } else if (e.key === "r" || e.key === "R") {
    reset();
  } else if (e.key === "t" || e.key === "T") {
    setOnTop(!settings.onTop);
  }
});

document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  reset();
});

// ---------- 주기적 갱신 ----------
setInterval(() => {
  if (state.running) {
    state.remainingMs = Math.max(0, state.endAt - Date.now());
    if (state.remainingMs === 0) {
      finish();
      return;
    }
  }
  drawWedge();
}, 200);

// ---------- 초기화 ----------
drawTicks();
drawWedge();
setOnTop(settings.onTop);
