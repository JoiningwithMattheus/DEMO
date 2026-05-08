let threshold = 0.75;
let streamActive = true;
let points = makeSeed();

const chart = document.querySelector("#sensor-chart");
const ctx = chart.getContext("2d");
const tempValue = document.querySelector("#temp-value");
const vibrationValue = document.querySelector("#vibration-value");
const vibrationPill = document.querySelector("#vibration-pill");
const lineStatus = document.querySelector("#line-status");
const toggleStream = document.querySelector("#toggle-stream");
const resetStream = document.querySelector("#reset-stream");
const thresholdInput = document.querySelector("#threshold-input");
const thresholdLabel = document.querySelector("#threshold-label");

toggleStream.addEventListener("click", () => {
  streamActive = !streamActive;
  toggleStream.textContent = streamActive ? "Pause stream" : "Resume stream";
});

resetStream.addEventListener("click", () => {
  points = makeSeed();
  render();
});

thresholdInput.addEventListener("input", () => {
  threshold = Number(thresholdInput.value);
  thresholdLabel.textContent = `${threshold.toFixed(2)} g`;
  render();
});

window.addEventListener("resize", render);

window.setInterval(() => {
  if (!streamActive) return;
  points = [...points.slice(1), nextPoint(points.at(-1))];
  render();
}, 1300);

render();

function makeSeed() {
  return Array.from({ length: 36 }, (_, index) => ({
    temp: 22.8 + Math.sin(index / 6) * 1.2 + Math.random() * 0.4,
    vibration: 0.42 + Math.sin(index / 4) * 0.08 + Math.random() * 0.08
  }));
}

function nextPoint(previous) {
  const spike = Math.random() > 0.9 ? Math.random() * 0.35 : 0;
  return {
    temp: clamp(previous.temp + (Math.random() - 0.5) * 0.6, 19, 32),
    vibration: clamp(previous.vibration + (Math.random() - 0.5) * 0.16 + spike, 0.18, 1.18)
  };
}

function render() {
  const latest = points.at(-1);
  const state = latest.vibration >= threshold + 0.2 ? "Critical" : latest.vibration >= threshold ? "Warning" : "Normal";
  const className = state === "Normal" ? "good" : state === "Warning" ? "warn" : "bad";

  tempValue.textContent = `${latest.temp.toFixed(1)} C`;
  vibrationValue.textContent = `${latest.vibration.toFixed(2)} g`;
  vibrationPill.textContent = state;
  vibrationPill.className = `pill ${className}`;
  lineStatus.textContent = state;
  drawChart();
}

function drawChart() {
  const rect = chart.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(310, Math.floor(rect.height || 340));

  chart.width = Math.floor(width * ratio);
  chart.height = Math.floor(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const pad = { top: 28, right: 24, bottom: 34, left: 44 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const max = 1.2;

  ctx.strokeStyle = "#d9dfd8";
  ctx.lineWidth = 1;
  for (let index = 0; index <= 4; index += 1) {
    const y = pad.top + (plotHeight / 4) * index;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotWidth, y);
    ctx.stroke();
  }

  const thresholdY = pad.top + plotHeight - (threshold / max) * plotHeight;
  ctx.strokeStyle = "#c7771c";
  ctx.setLineDash([7, 6]);
  ctx.beginPath();
  ctx.moveTo(pad.left, thresholdY);
  ctx.lineTo(pad.left + plotWidth, thresholdY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = pad.left + (index / (points.length - 1)) * plotWidth;
    const y = pad.top + plotHeight - (point.vibration / max) * plotHeight;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const latest = points.at(-1);
  const x = pad.left + plotWidth;
  const y = pad.top + plotHeight - (latest.vibration / max) * plotHeight;
  ctx.fillStyle = latest.vibration >= threshold ? "#c7771c" : "#0f766e";
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#627068";
  ctx.font = "700 12px Inter, system-ui, sans-serif";
  ctx.fillText("1.2 g", 4, pad.top + 4);
  ctx.fillText("0 g", 16, pad.top + plotHeight);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
