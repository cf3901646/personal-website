export type CvPresetKey = 'compact' | 'balanced' | 'airy';

export interface CvTypographyState {
  font: number;
  line: number;
  gap: number;
  margin: number;
  preset: CvPresetKey;
}

export const CV_PRESETS: Record<CvPresetKey, { label: string; values: [number, number, number, number] }> = {
  compact: { label: '紧凑', values: [10.5, 1.44, 11, 20] },
  balanced: { label: '均衡', values: [10.8, 1.58, 14, 22] },
  airy: { label: '舒展', values: [11.2, 1.72, 18, 24] },
};

export const CV_RANGES: [number, number][] = [
  [10, 12],
  [1.4, 1.8],
  [10, 20],
  [18, 26],
];

export const INDOOR_TEMPS = [
  26.2, 26, 25.8, 25.6, 25.5, 25.5, 25.6, 25.8, 26, 26.4, 26.8, 27.2, 27.6,
  27.9, 28.2, 28.5, 28.7, 28.6, 28.3, 27.9, 27.5, 27.1, 26.8, 26.5, 26.2,
];

export const OUTDOOR_TEMPS = [
  25, 24.5, 24.1, 23.8, 23.6, 23.8, 24.5, 26, 28.1, 30.5, 32.8, 34.3, 35.2,
  35.7, 35.8, 35.3, 34.1, 32.3, 30.2, 28.7, 27.7, 26.8, 26, 25.4, 25,
];

export function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

export function easeInOutCubic(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

export function smoothStep(start: number, end: number, value: number): number {
  if (end === start) return value >= end ? 1 : 0;
  return easeInOutCubic((value - start) / (end - start));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function computeTrackFill(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return clamp((value - min) / (max - min), 0, 1) * 100;
}

export function computeCvStateFromProgress(progress: number): CvTypographyState {
  const p = clamp(progress, 0, 1);
  const keys: CvPresetKey[] = ['compact', 'balanced', 'airy'];
  const segment = p < 0.5 ? 0 : 1;
  const t = easeInOutCubic((p - segment * 0.5) * 2);
  const from = CV_PRESETS[keys[segment]].values;
  const to = CV_PRESETS[keys[segment + 1]].values;

  const font = Number(lerp(from[0], to[0], t).toFixed(2));
  const line = Number(lerp(from[1], to[1], t).toFixed(2));
  const gap = Number(lerp(from[2], to[2], t).toFixed(2));
  const margin = Number(lerp(from[3], to[3], t).toFixed(2));
  const activeIdx = p < 0.25 ? 0 : p < 0.75 ? 1 : 2;

  return {
    font,
    line,
    gap,
    margin,
    preset: keys[activeIdx],
  };
}

export function computeRestoreFromProgress(progress: number, isDesktopStaggered = false): number {
  const start = isDesktopStaggered ? 0.03 : 0.06;
  const span = isDesktopStaggered ? 0.58 : 0.88;
  const t = easeInOutCubic((progress - start) / span);
  return Math.round(lerp(20, 92, t));
}

export function computeWeatherHourFromProgress(progress: number, isDesktopStaggered = false): number {
  const start = isDesktopStaggered ? 0.32 : 0.04;
  const span = isDesktopStaggered ? 0.64 : 0.92;
  const dayProgress = clamp((progress - start) / span, 0, 1);
  return Number((dayProgress * 24).toFixed(2));
}

export function weatherX(hour: number): number {
  return 8 + clamp(hour, 0, 24) * 16;
}

export function weatherY(degrees: number): number {
  return 115 - (degrees - 22) * 7;
}

export function sampleTemperature(data: number[], hour: number): number {
  const h = clamp(hour, 0, 24);
  const i = Math.min(23, Math.floor(h));
  const t = h - i;
  const a = data[Math.max(0, i - 1)];
  const b = data[i];
  const c = data[i + 1];
  const d = data[Math.min(24, i + 2)];
  return (
    0.5 *
    (2 * b +
      (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t * t +
      (-a + 3 * b - 3 * c + d) * t * t * t)
  );
}

export function buildSplineCurve(data: number[]): string {
  const points = data.map((temperature, hour) => [weatherX(hour), weatherY(temperature)]);
  let path = `M${points[0].join(',')}`;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[i];
    const c = points[i + 1];
    const d = points[Math.min(points.length - 1, i + 2)];
    path += ` C${(b[0] + 16 / 3).toFixed(2)},${(b[1] + (c[1] - a[1]) / 6).toFixed(2)} ${(
      c[0] -
      16 / 3
    ).toFixed(2)},${(c[1] - (d[1] - b[1]) / 6).toFixed(2)} ${c[0].toFixed(2)},${c[1].toFixed(2)}`;
  }
  return path;
}

export function formatHourToTime(hour: number): string {
  const h = clamp(hour, 0, 24);
  const totalMinutes = Math.round(h * 60);
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export interface SolarConditions {
  bloomColor: string;
  shadowAlpha: number;
  shadowX: number;
  shadowY: number;
  shadowScale: number;
  paperTone: string;
}

export function getSolarConditions(hourFloat?: number): SolarConditions {
  let h = hourFloat;
  if (typeof h !== 'number') {
    const now = new Date();
    h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  }

  if (h >= 5 && h < 9.5) {
    const p = (h - 5) / 4.5;
    return {
      bloomColor: 'radial-gradient(ellipse at 42% 62%, #fff5dbcc, transparent 58%)',
      shadowAlpha: 0.55 + p * 0.1,
      shadowX: -35 + p * 15,
      shadowY: 15 - p * 15,
      shadowScale: 1.12 - p * 0.12,
      paperTone: '#f5f2ea',
    };
  } else if (h >= 9.5 && h < 16) {
    const p = (h - 9.5) / 6.5;
    return {
      bloomColor: 'radial-gradient(ellipse at 48% 65%, #fffcedd0, transparent 55%)',
      shadowAlpha: 0.65,
      shadowX: -20 - p * 15,
      shadowY: p * 10,
      shadowScale: 1.0 + p * 0.08,
      paperTone: '#f3f0e7',
    };
  } else if (h >= 16 && h < 19.5) {
    const p = (h - 16) / 3.5;
    return {
      bloomColor: 'radial-gradient(ellipse at 52% 70%, #ffd79ecc, transparent 60%)',
      shadowAlpha: 0.62 - p * 0.12,
      shadowX: -35 - p * 30,
      shadowY: 10 + p * 25,
      shadowScale: 1.08 + p * 0.16,
      paperTone: '#f2ece0',
    };
  } else {
    return {
      bloomColor: 'radial-gradient(ellipse at 48% 60%, #ffe9c766, transparent 65%)',
      shadowAlpha: 0.58,
      shadowX: -18,
      shadowY: 4,
      shadowScale: 1.04,
      paperTone: '#eee8da',
    };
  }
}

// ---- 一车之地：标准车位里的开门余量 ----
// 车位按商场常见的 5300 × 2500 mm；开门余量的算法和阈值与一车之地保持一致。
export const CAR_SPOT = { length: 5300, width: 2500 };

export interface CarModel {
  key: string;
  name: string;
  length: number;
  width: number;
}

// 尺寸取自一车之地 data/series.json 的官方参配
export const CAR_MODELS: CarModel[] = [
  { key: 'dolphin', name: '比亚迪海豚', length: 4125, width: 1770 },
  { key: 'qin', name: '比亚迪秦PLUS', length: 4780, width: 1837 },
  { key: 'model-y', name: '特斯拉Model Y', length: 4797, width: 1920 },
  { key: 'su7', name: '小米SU7', length: 4997, width: 1963 },
  { key: 'l9', name: '理想L9', length: 5255, width: 2000 },
];

export type DoorTone = 'roomy' | 'normal' | 'tight';

export interface CarFit {
  door: number;
  front: number;
  tone: DoorTone;
  verdict: string;
}

export function computeCarFit(model: CarModel, spot = CAR_SPOT): CarFit {
  const door = Math.round((spot.width - model.width) / 2);
  const front = spot.length - model.length;
  const tone: DoorTone = door < 280 ? 'tight' : door < 320 ? 'normal' : 'roomy';
  const verdict = tone === 'tight' ? '开门狭窄易碰' : tone === 'normal' ? '正常开门' : '开门充裕';
  return { door, front, tone, verdict };
}

export function carIndexFromProgress(progress: number, count = CAR_MODELS.length): number {
  const t = clamp((progress - 0.04) / 0.88, 0, 1);
  return Math.min(count - 1, Math.floor(t * count));
}

// ---- Space DJ：飞船沿星座航行，音乐风格按位置混合 ----
export interface SpaceStar {
  name: string;
  x: number; // 0..1，占星图宽度的比例
  y: number; // 0..1，占星图高度的比例
}

export const SPACE_STARS: SpaceStar[] = [
  { name: 'piano', x: 0.1, y: 0.62 },
  { name: 'ambient', x: 0.26, y: 0.3 },
  { name: 'lo-fi', x: 0.43, y: 0.6 },
  { name: 'bossa nova', x: 0.6, y: 0.27 },
  { name: 'dub', x: 0.76, y: 0.63 },
  { name: 'techno', x: 0.9, y: 0.33 },
];

export interface SpaceMix {
  segment: number; // 当前所在的星座线段序号
  local: number; // 线段内的进度 0..1
  x: number;
  y: number;
}

export function computeSpaceMix(t: number, stars: SpaceStar[] = SPACE_STARS): SpaceMix {
  const spans = stars.length - 1;
  const pos = clamp(t, 0, 1) * spans;
  const segment = Math.min(spans - 1, Math.floor(pos));
  const local = pos - segment;
  const a = stars[segment];
  const b = stars[segment + 1];
  return { segment, local, x: lerp(a.x, b.x, local), y: lerp(a.y, b.y, local) };
}

export function spaceProgressFromScroll(progress: number): number {
  return clamp((progress - 0.05) / 0.85, 0, 1);
}

// 按横坐标反查航线进度（星座沿 x 单调排列）
export function spaceProgressFromX(ratio: number, stars: SpaceStar[] = SPACE_STARS): number {
  const spans = stars.length - 1;
  if (ratio <= stars[0].x) return 0;
  for (let i = 0; i < spans; i++) {
    const a = stars[i].x;
    const b = stars[i + 1].x;
    if (ratio <= b) return (i + (ratio - a) / (b - a)) / spans;
  }
  return 1;
}

// 背景小星：固定种子的伪随机分布，每次渲染一致
export const SPACE_DUST: { x: number; y: number; r: number; o: number }[] = (() => {
  let seed = 20261026;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: 54 }, () => ({
    x: rand(),
    y: rand(),
    r: 0.5 + rand() * 0.8,
    o: 0.18 + rand() * 0.42,
  }));
})();
