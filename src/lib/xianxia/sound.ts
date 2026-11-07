"use client";

/**
 * ============================================================================
 * 《仙途寻道 · 国风五声音阶合成器与游戏音效引擎》
 * XianxiaAudioEngine (Pure Web Audio API · Zero External Assets)
 *
 * 核心技术特色：
 * 1. 全局声场：2.5s 指数衰减算法脉冲立体声混响 (ConvolverNode) + 动态压限 (DynamicsCompressorNode)
 * 2. 传统调式：严格锁定 D 宫五声调式 (正宫调：D, E, F#, A, B)，无杂音半音，清丽空灵
 * 3. 乐器建模：
 *    - 古筝/琵琶：多谐波叠加 + 快速闭合低通滤波包络 (5200Hz -> 1400Hz) + 32分音符轮指 (Tremolo) 与刮奏 (Glissando)
 *    - 竹笛：正弦/三角波混合 + 基频跟随带通滤波 + 35ms 吹孔微气流 (Chiff) + 5.5Hz 颤音 (LFO)
 *    - 古琴深音：低八度长衰减木质拨弦根音
 *    - 玉磬：非整数倍高频泛音列 (f, 2.76f, 5.4f) 拟真金玉鸣响
 * 4. 10 大修仙游戏实时音效：轻触白玉、播种入土、清泉润泽、真火炼丹、天工铸剑打铁、
 *    破空剑气、雷霆暴击、罡气受击、玉珠扣减、古琴闷弦警示
 * ============================================================================
 */

export interface XianxiaAudioEngineConfig {
  bgmVolume?: number;
  sfxVolume?: number;
  reverbWet?: number;
}

export class XianxiaAudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized: boolean = false;
  private sfxEnabled: boolean = true;
  private bgmEnabled: boolean = false;

  // Master Audio Bus
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Lookahead Scheduler for BGM
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime: number = 0;
  private currentStep: number = 0;
  private readonly scheduleAheadTime: number = 0.12; // 120ms 预排程时间窗口
  private readonly lookaheadIntervalMs: number = 25; // 25ms 高频时钟循环
  private readonly bpm: number = 142; // 轻快御剑速度
  private readonly eighthDuration: number = 60 / 142 / 2; // ~0.2112s (八分音符)

  // --------------------------------------------------------------------------
  // D 宫五声调式音高频率表 (宫:D, 商:E, 角:F#, 徵:A, 羽:B)
  // --------------------------------------------------------------------------
  private readonly NOTES = {
    // 低音部 (古琴根音 / 伴奏)
    D2: 73.42,
    E2: 82.41,
    Fs2: 92.50,
    A2: 110.00,
    B2: 123.47,
    D3: 146.83,
    E3: 164.81,
    Fs3: 185.00,
    A3: 220.00,
    B3: 246.94,

    // 中音部 (琵琶主旋律)
    D4: 293.66,
    E4: 329.63,
    Fs4: 369.99,
    A4: 440.00,
    B4: 493.88,

    // 高音部 (古筝清音 / 竹笛飞扬)
    D5: 587.33,
    E5: 659.25,
    Fs5: 739.99,
    A5: 880.00,
    B5: 987.77,

    // 倍高音部 (玉磬 / 泛音花指)
    D6: 1174.66,
    E6: 1318.51,
    Fs6: 1479.98,
    A6: 1760.00,
    B6: 1975.53,
  };

  // 《御剑乘风·仙山晴雪》64 拍轻灵仙侠乐章 (对应 NOTES 键名，null 代表休止)
  private readonly SCORE_MELODY: Array<keyof typeof this.NOTES | null> = [
    // 乐段一：御剑穿云 (轻盈起势，流水飞花)
    "D5", "E5", "Fs5", "A5",   "B5", "A5", "Fs5", "D5",
    "E5", "Fs5", "A5", "Fs5",  "E5", null, "D5", "E5",
    "Fs5", "A5", "B5", "D6",   "E6", "D6", "B5", "A5",
    "B5", "D6", "A5", "Fs5",   "E5", null, "D5", null,

    // 乐段二：仙山晴雪 (高亢明朗，云海浩渺)
    "A5", "B5", "D6", "E6",    "Fs6", "E6", "D6", "B5",
    "D6", "E6", "Fs6", "D6",   "B5", null, "A5", "B5",
    "D6", "B5", "A5", "Fs5",   "A5", "Fs5", "E5", "D5",
    "E5", "Fs5", "E5", "B4",   "D5", null, "D5", null,
  ];

  // 低音古琴和声走势 (每 4 拍八分音符推进一次根音)
  private readonly SCORE_BASS: Array<keyof typeof this.NOTES> = [
    "D3", "D3", "Fs3", "A2", "B2", "A2", "D3", "D3",
    "Fs3", "A3", "B2", "D3", "A2", "B2", "D3", "D3",
  ];

  constructor() {
    // 仅在浏览器环境下监听首次交互以自动解锁 AudioContext
    if (typeof window !== "undefined") {
      const unlock = () => {
        this.init();
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
      };
      window.addEventListener("pointerdown", unlock, { passive: true });
      window.addEventListener("keydown", unlock, { passive: true });
    }
  }

  // ==========================================================================
  // 一、全局声场构建 (Master Bus & Space)
  // ==========================================================================

  public init(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (this.ctx && this.isInitialized) {
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();

      // 1. 动态压限器 (DynamicsCompressorNode)：挂载在 destination 之前，防止多轨叠加爆音
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(16, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4.5, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      // 2. 总音量母线 (Master Gain)
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.masterGain.connect(this.compressor);

      // 3. 仙山空灵混响 (ConvolverNode 脉冲生成)
      // 动态生成 2.5 秒指数衰减的立体声云海仙山脉冲响应
      this.convolver = this.ctx.createConvolver();
      this.convolver.buffer = this.buildReverbImpulseResponse(this.ctx, 2.5, 2.4);

      // 干湿声配比 (Dry 75% : Wet 25%)
      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
      this.dryGain.connect(this.masterGain);

      this.wetGain = this.ctx.createGain();
      this.wetGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      this.convolver.connect(this.wetGain);
      this.wetGain.connect(this.masterGain);

      // 4. BGM 与 SFX 分路增益母线
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.32, this.ctx.currentTime);
      this.bgmGain.connect(this.dryGain);
      this.bgmGain.connect(this.convolver);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.68, this.ctx.currentTime);
      this.sfxGain.connect(this.dryGain);
      this.sfxGain.connect(this.convolver);

      this.isInitialized = true;
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    } catch (err) {
      console.warn("XianxiaAudioEngine initialization skipped:", err);
    }

    return this.ctx;
  }

  /**
   * 动态生成 2.5 秒指数衰减立体声脉冲响应 Buffer
   */
  private buildReverbImpulseResponse(
    ctx: AudioContext,
    duration: number,
    decay: number
  ): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const buffer = ctx.createBuffer(2, length, rate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // 采用指数包络 + 随机高斯扩散模拟真实仙山洞府反射
    for (let i = 0; i < length; i++) {
      const t = i / rate;
      const env = Math.exp(-decay * t);
      // 轻微的立体声去相关与高频吸声模拟
      const damping = 1 - (i / length) * 0.45;
      left[i] = (Math.random() * 2 - 1) * env * damping;
      right[i] = (Math.random() * 2 - 1) * env * damping;
    }
    return buffer;
  }

  private getContext(): AudioContext | null {
    if (!this.ctx || !this.isInitialized) {
      return this.init();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // ==========================================================================
  // 二、国风乐器物理建模合成器 (Plucked Zither / Dizi / Guqin / Jade Chime)
  // ==========================================================================

  /**
   * 1. 古筝/琵琶清脆主音 (Plucked Zither / Pipa)
   * 结构：基频 (triangle) + 2倍频 (sine, 0.35) + 3倍频琴弦金属感 (sawtooth, 0.12)
   * 滤波包络：起音瞬间 lowpass 从 5200Hz 在 0.08s 内指数衰减至 1400Hz (指甲触弦劈挑声)
   */
  public playPluckedZither(
    freq: number,
    time: number,
    duration: number = 0.75,
    volume: number = 0.5,
    detuneCents: number = 0
  ): void {
    const ctx = this.getContext();
    if (!ctx || !this.bgmGain) return;

    const t = Math.max(ctx.currentTime, time);

    // 1. 基频 (Triangle)
    const osc1 = ctx.createOscillator();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(freq, t);
    osc1.detune.setValueAtTime(detuneCents, t);

    // 2. 2倍频泛音 (Sine)
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq * 2, t);
    osc2.detune.setValueAtTime(detuneCents, t);

    // 3. 3倍频琴弦金属质感 (Sawtooth)
    const osc3 = ctx.createOscillator();
    osc3.type = "sawtooth";
    osc3.frequency.setValueAtTime(freq * 3, t);
    osc3.detune.setValueAtTime(detuneCents, t);

    // 各谐波混音增益
    const g1 = ctx.createGain();
    const g2 = ctx.createGain();
    const g3 = ctx.createGain();

    g1.gain.setValueAtTime(0.65, t);
    g2.gain.setValueAtTime(0.35, t);
    g3.gain.setValueAtTime(0.12, t);

    osc1.connect(g1);
    osc2.connect(g2);
    osc3.connect(g3);

    // 快速闭合的低通滤波器包络 (低通动态滤除琴弦高频，拟真触弦刹那)
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.setValueAtTime(2.2, t);
    filter.frequency.setValueAtTime(5200, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + 0.08);

    g1.connect(filter);
    g2.connect(filter);
    g3.connect(filter);

    // 振幅包络 (快速 3ms 起音，平滑指数释音)
    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(0.001, t);
    voiceGain.gain.linearRampToValueAtTime(volume * 0.38, t + 0.003);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    filter.connect(voiceGain);
    voiceGain.connect(this.bgmGain);

    osc1.start(t);
    osc2.start(t);
    osc3.start(t);
    osc1.stop(t + duration + 0.05);
    osc2.stop(t + duration + 0.05);
    osc3.stop(t + duration + 0.05);
  }

  /**
   * 琵琶轮指技法 (Pipa Tremolo)
   * 以 32 分音符（约 32ms）连续快速触发 4~5 次同音，每次加入 ±4% 随机力度与微小音高偏移
   */
  public playPipaTremolo(freq: number, startTime: number, count: number = 4): void {
    const tremoloInterval = 0.032; // 32ms
    for (let i = 0; i < count; i++) {
      const t = startTime + i * tremoloInterval;
      const velocityRnd = 1 + (Math.random() * 0.08 - 0.04); // ±4%
      const detuneRnd = Math.random() * 6 - 3; // ±3 cents
      const noteVol = 0.42 * velocityRnd * (0.85 + (i / count) * 0.25);
      this.playPluckedZither(freq, t, 0.45, noteVol, detuneRnd);
    }
  }

  /**
   * 古筝刮奏流水流水感 (Guzheng Glissando)
   * 自下而上以 28ms 间隔快速扫过 7 个五声音阶音符
   */
  public playGuzhengGlissando(startTime: number): void {
    const sweepNotes: Array<keyof typeof this.NOTES> = [
      "D4", "E4", "Fs4", "A4", "B4", "D5", "Fs5",
    ];
    const stepInterval = 0.028; // 28ms
    sweepNotes.forEach((noteKey, idx) => {
      const f = this.NOTES[noteKey];
      const t = startTime + idx * stepInterval;
      const vol = 0.32 + (idx / sweepNotes.length) * 0.15;
      this.playPluckedZither(f, t, 0.5, vol, Math.random() * 4 - 2);
    });
  }

  /**
   * 2. 竹笛灵动副旋 (Bamboo Dizi)
   * 结构：sine + triangle 混合，中心频率跟随基频的 bandpass 滤波 (Q=3.5)
   * 细节：起音前 35ms 混入轻微 2800Hz 吹孔风声 (Chiff)，长音挂载 5.5Hz LFO 吟音颤音
   */
  public playDiziFlute(
    freq: number,
    startTime: number,
    duration: number = 0.85,
    volume: number = 0.38
  ): void {
    const ctx = this.getContext();
    if (!ctx || !this.bgmGain) return;

    const t = Math.max(ctx.currentTime, startTime);

    // 1. 吹孔破竹风声微气流 (Chiff 噪音前驱)
    const chiffLen = 0.035; // 35ms
    const bufferSize = Math.floor(ctx.sampleRate * chiffLen);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(2800, t);
    noiseFilter.Q.setValueAtTime(4.0, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.06, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + chiffLen);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.bgmGain);

    noise.start(t);

    // 2. 竹笛音色合成 (Sine + Triangle)
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(freq, t);

    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(freq, t);

    // 5.5Hz LFO 调制音高 (±8 cents 吟音/颤音，长音在 0.12s 后自然渗出)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(5.5, t);
    lfoGain.gain.setValueAtTime(0, t);
    lfoGain.gain.setValueAtTime(0, t + 0.12);
    lfoGain.gain.linearRampToValueAtTime(freq * 0.005, t + 0.35); // ±8 cents

    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(freq, t);
    bandpass.Q.setValueAtTime(3.5, t);

    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(0.001, t);
    voiceGain.gain.linearRampToValueAtTime(volume * 0.32, t + 0.06);
    voiceGain.gain.setValueAtTime(volume * 0.3, t + duration * 0.65);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc1.connect(bandpass);
    osc2.connect(bandpass);
    bandpass.connect(voiceGain);
    voiceGain.connect(this.bgmGain);

    osc1.start(t);
    osc2.start(t);
    lfo.start(t);
    osc1.stop(t + duration + 0.05);
    osc2.stop(t + duration + 0.05);
    lfo.stop(t + duration + 0.05);
  }

  /**
   * 3. 低音古琴拨弦根音 (Deep Guqin Bass)
   * 慢起音 (15ms)，长余韵 (1.2s)，低通平滑衰减，厚实承托下盘
   */
  public playGuqinBass(freq: number, startTime: number, duration: number = 1.2): void {
    const ctx = this.getContext();
    if (!ctx || !this.bgmGain) return;

    const t = Math.max(ctx.currentTime, startTime);

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(freq, t);

    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(freq * 2, t);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(420, t);
    filter.frequency.exponentialRampToValueAtTime(160, t + 0.6);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, t);
    gainNode.gain.linearRampToValueAtTime(0.38, t + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.bgmGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + duration + 0.05);
    osc2.stop(t + duration + 0.05);
  }

  /**
   * 4. 空灵玉磬 (Jade Chime)
   * 使用非整数倍高频正弦波叠加 (f, 2.76f, 5.4f) 拟真玉石敲击泛音列，清亮空灵
   */
  public playJadeChime(
    baseFreq: number = 1760,
    startTime: number,
    volume: number = 0.28
  ): void {
    const ctx = this.getContext();
    if (!ctx || !this.bgmGain) return;

    const t = Math.max(ctx.currentTime, startTime);
    const harmonics = [
      { f: baseFreq, g: 0.6 },
      { f: baseFreq * 2.76, g: 0.28 },
      { f: baseFreq * 5.4, g: 0.12 },
    ];

    harmonics.forEach((h) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(h.f, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * h.g, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);

      osc.connect(gain);
      gain.connect(this.bgmGain!);

      osc.start(t);
      osc.stop(t + 1.45);
    });
  }

  // ==========================================================================
  // 三、BGM 调度器：《御剑乘风·仙山晴雪》 (~142 BPM)
  // ==========================================================================

  public startBGM(): void {
    this.startBgm();
  }

  public startBgm(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    this.bgmEnabled = true;
    this.currentStep = 0;
    this.nextNoteTime = ctx.currentTime + 0.05;

    if (this.schedulerTimer) clearInterval(this.schedulerTimer);

    // 立即弹出一记古筝五声刮奏拂面
    this.playGuzhengGlissando(ctx.currentTime + 0.02);

    this.schedulerTimer = setInterval(() => {
      this.runScheduler();
    }, this.lookaheadIntervalMs);
  }

  public stopBGM(): void {
    this.stopBgm();
  }

  public stopBgm(): void {
    this.bgmEnabled = false;
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  public toggleBGM(): boolean {
    return this.toggleBgm();
  }

  public toggleBgm(): boolean {
    if (this.bgmEnabled) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
    return this.bgmEnabled;
  }

  public isBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  public setVolume(bgmVol?: number, sfxVol?: number): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (typeof bgmVol === "number" && this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(Math.max(0, Math.min(1, bgmVol)), now, 0.05);
    }
    if (typeof sfxVol === "number" && this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(Math.max(0, Math.min(1, sfxVol)), now, 0.05);
    }
  }

  /**
   * Lookahead 预排程调度核心 (Web Audio API 精准时钟)
   */
  private runScheduler(): void {
    const ctx = this.getContext();
    if (!ctx || !this.bgmEnabled) return;

    while (this.nextNoteTime < ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.nextNoteTime += this.eighthDuration;
      this.currentStep = (this.currentStep + 1) % this.SCORE_MELODY.length;
    }
  }

  private scheduleStep(step: number, time: number): void {
    const noteKey = this.SCORE_MELODY[step];

    // 1. 声部一：古筝 / 琵琶清脆主音
    if (noteKey) {
      const freq = this.NOTES[noteKey];
      const isDownbeat = step % 4 === 0;

      // 乐段高潮点 (第 20、36 拍) 或长音拍位触发琵琶轮指 (Tremolo)
      if (step === 20 || step === 36 || (step % 16 === 12 && Math.random() > 0.4)) {
        this.playPipaTremolo(freq, time, 4);
      } else {
        this.playPluckedZither(
          freq,
          time,
          isDownbeat ? 0.65 : 0.42,
          isDownbeat ? 0.58 : 0.42
        );
      }

      // 每 8 小节过渡或乐句衔接处触发古筝刮奏流水 (Glissando)
      if (step === 30 || step === 62) {
        this.playGuzhengGlissando(time + this.eighthDuration * 0.4);
      }
    }

    // 2. 声部二：竹笛灵动副旋 (穿插在主旋律长音间隙，营造高山流水意境)
    if (step % 8 === 4 && (step === 12 || step === 28 || step === 44)) {
      const flutePitchKey = (noteKey || "A5") as keyof typeof this.NOTES;
      const f = this.NOTES[flutePitchKey];
      this.playDiziFlute(f, time, this.eighthDuration * 3.5, 0.36);
    }

    // 3. 声部三：低音古琴根音 (每 4 拍下盘承托)
    if (step % 4 === 0) {
      const bassIndex = Math.floor(step / 4) % this.SCORE_BASS.length;
      const bassNote = this.SCORE_BASS[bassIndex];
      this.playGuqinBass(this.NOTES[bassNote], time, this.eighthDuration * 3.6);
    }

    // 4. 声部四：玉磬清澈点缀 (强拍与小节尾点缀)
    if (step === 0 || step === 16 || step === 32 || step === 48) {
      this.playJadeChime(this.NOTES.A5, time, 0.22);
    } else if (step === 60) {
      this.playJadeChime(this.NOTES.D6, time, 0.28);
    }
  }

  // ==========================================================================
  // 四、10 大修仙游戏实时音效 (SFX) 纯原生合成器
  // ==========================================================================

  /**
   * 1. playClick() —— 轻触白玉 / 玉简点击
   * 规范：极短促 (45ms) 高频双音正弦波 (1800Hz + 4200Hz)，指数极速衰减，清脆玉石感
   */
  public playClick(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1800, t);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(4200, t);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.05);
    osc2.stop(t + 0.05);
  }

  /**
   * 2. playSow() / playPlant() —— 灵畦播种 · 入土生根
   * 规范：先是一声柔和低频泥土轻响 (160Hz -> 90Hz 下潜 + 带通微噪)，
   * 紧接延迟 60ms 升起两颗清脆五声泛音 (A5 -> D6)，表现灵种生机萌发
   */
  public playSow(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;

    // 1. 低频泥土轻响 (160Hz -> 90Hz)
    const earthOsc = ctx.createOscillator();
    earthOsc.type = "triangle";
    earthOsc.frequency.setValueAtTime(160, t);
    earthOsc.frequency.exponentialRampToValueAtTime(90, t + 0.055);

    const earthGain = ctx.createGain();
    earthGain.gain.setValueAtTime(0.24, t);
    earthGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

    earthOsc.connect(earthGain);
    earthGain.connect(this.sfxGain);
    earthOsc.start(t);
    earthOsc.stop(t + 0.065);

    // 2. 延迟 60ms 升起的灵苗五声泛音 (A5 -> D6)
    const sproutDelay = 0.06;
    [
      { f: this.NOTES.A5, dt: sproutDelay },
      { f: this.NOTES.D6, dt: sproutDelay + 0.075 },
    ].forEach((tone) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(tone.f, t + tone.dt);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t + tone.dt);
      gain.gain.linearRampToValueAtTime(0.18, t + tone.dt + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + tone.dt + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + tone.dt);
      osc.stop(t + tone.dt + 0.3);
    });
  }

  public playPlant(): void {
    this.playSow();
  }

  /**
   * 3. playSpring() / playWater() —— 引灵泉润泽 · 清泉叮咚
   * 规范：350ms 内随机触发 5~6 颗高八度五声水滴音 (30ms 向上滑音 +150Hz + 高 Q 带通)，辅以柔和流水滤波微噪
   */
  public playSpring(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;

    // 1. 流水柔和微噪 (渐入渐出)
    const noiseLen = 0.38;
    const bufferSize = Math.floor(ctx.sampleRate * noiseLen);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(1400, t);
    noiseFilter.Q.setValueAtTime(2.5, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, t);
    noiseGain.gain.linearRampToValueAtTime(0.065, t + 0.1);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + noiseLen);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noiseSrc.start(t);

    // 2. 5 颗五声水滴音 (正弦波 30ms 向上快速滑音 pitch bend +150Hz)
    const dropletNotes = [this.NOTES.D6, this.NOTES.Fs6, this.NOTES.A6, this.NOTES.E6, this.NOTES.D6];
    dropletNotes.forEach((baseFreq, idx) => {
      const dropTime = t + idx * 0.062 + Math.random() * 0.018;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, dropTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq + 150, dropTime + 0.03);

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(baseFreq + 75, dropTime);
      filter.Q.setValueAtTime(9.0, dropTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, dropTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, dropTime + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(dropTime);
      osc.stop(dropTime + 0.13);
    });
  }

  public playWater(): void {
    this.playSpring();
  }

  /**
   * 4. playAlchemy() / playHarvest() —— 丹炉炼丹 · 真火凝丹
   * 规范：底层 400ms 低频真火轰鸣 (lowpass 350Hz 调制噪声 + 110Hz 脉冲)，
   * 随后一记空灵悠长的五声和弦泛音 (D5 + A5 + E6 + F#6) 向上绽放并带长尾声
   */
  public playAlchemy(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;

    // 1. 真火低频脉冲 (110Hz 脉冲 + 350Hz 低通滤波火焰)
    const fireOsc = ctx.createOscillator();
    fireOsc.type = "sawtooth";
    fireOsc.frequency.setValueAtTime(110, t);
    fireOsc.frequency.exponentialRampToValueAtTime(65, t + 0.4);

    const fireFilter = ctx.createBiquadFilter();
    fireFilter.type = "lowpass";
    fireFilter.frequency.setValueAtTime(350, t);

    const fireGain = ctx.createGain();
    fireGain.gain.setValueAtTime(0.22, t);
    fireGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);

    fireOsc.connect(fireFilter);
    fireFilter.connect(fireGain);
    fireGain.connect(this.sfxGain);
    fireOsc.start(t);
    fireOsc.stop(t + 0.43);

    // 2. 金丹出炉空灵五声和弦绽放 (D5 + A5 + E6 + F#6)
    const chordNotes = [this.NOTES.D5, this.NOTES.A5, this.NOTES.E6, this.NOTES.Fs6];
    chordNotes.forEach((f, idx) => {
      const noteStart = t + 0.12 + idx * 0.045;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, noteStart);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(0.19, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 1.6);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(noteStart);
      osc.stop(noteStart + 1.65);
    });
  }

  public playHarvest(): void {
    this.playAlchemy();
  }

  /**
   * 5. playForge() —— 天工铸剑 · 百炼打铁
   * 规范：高频非谐波金属 FM 合成 (载波 680Hz + 调制波 965Hz)，
   * 叠加 30ms 高通火花瞬态冲击 + 0.6s 金属余震 (2400Hz + 3850Hz)
   */
  public playForge(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;

    // 1. 铁砧铸剑 FM 频率调制 (载波 680Hz，调制波 965Hz，调制量 420Hz)
    const carrier = ctx.createOscillator();
    carrier.type = "sine";
    carrier.frequency.setValueAtTime(680, t);

    const modulator = ctx.createOscillator();
    modulator.type = "sine";
    modulator.frequency.setValueAtTime(965, t);

    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(420, t);
    modGain.gain.exponentialRampToValueAtTime(10, t + 0.28);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    const anvilGain = ctx.createGain();
    anvilGain.gain.setValueAtTime(0.32, t);
    anvilGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

    carrier.connect(anvilGain);
    anvilGain.connect(this.sfxGain);

    carrier.start(t);
    modulator.start(t);
    carrier.stop(t + 0.36);
    modulator.stop(t + 0.36);

    // 2. 30ms 瞬态打铁火花 (高通噪声)
    const sparkBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
    const sparkData = sparkBuffer.getChannelData(0);
    for (let i = 0; i < sparkData.length; i++) {
      sparkData[i] = Math.random() * 2 - 1;
    }
    const sparkSrc = ctx.createBufferSource();
    sparkSrc.buffer = sparkBuffer;

    const sparkFilter = ctx.createBiquadFilter();
    sparkFilter.type = "highpass";
    sparkFilter.frequency.setValueAtTime(2600, t);

    const sparkGain = ctx.createGain();
    sparkGain.gain.setValueAtTime(0.25, t);
    sparkGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);

    sparkSrc.connect(sparkFilter);
    sparkFilter.connect(sparkGain);
    sparkGain.connect(this.sfxGain);
    sparkSrc.start(t);

    // 3. 0.6s 高频金属回响余震 (2400Hz + 3850Hz)
    [2400, 3850].forEach((freq) => {
      const ringOsc = ctx.createOscillator();
      ringOsc.type = "sine";
      ringOsc.frequency.setValueAtTime(freq, t);

      const ringGain = ctx.createGain();
      ringGain.gain.setValueAtTime(0.12, t);
      ringGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);

      ringOsc.connect(ringGain);
      ringGain.connect(this.sfxGain!);

      ringOsc.start(t);
      ringOsc.stop(t + 0.62);
    });
  }

  /**
   * 6. playSwordSlash() —— 飞剑斩击 · 破空剑气
   * 规范：白噪音经 bandpass (Q=6) 在 140ms 内从 3800Hz 极速扫频至 400Hz，
   * 叠加从 1600Hz 锐降至 300Hz 的锯齿波剑鸣。若 isCrit 为真则触发天道暴击
   */
  public playSwordSlash(isCrit = false): void {
    if (isCrit) {
      this.playCrit();
      return;
    }

    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const dur = 0.14; // 140ms

    // 1. 破空风声 (带通滤波白噪音极速扫频 3800Hz -> 400Hz)
    const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.setValueAtTime(6.0, t);
    filter.frequency.setValueAtTime(3800, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + dur);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.24, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noiseSrc.start(t);

    // 2. 剑鸣金属破空 (锯齿波 1600Hz -> 300Hz)
    const bladeOsc = ctx.createOscillator();
    bladeOsc.type = "sawtooth";
    bladeOsc.frequency.setValueAtTime(1600, t);
    bladeOsc.frequency.exponentialRampToValueAtTime(300, t + dur);

    const bladeGain = ctx.createGain();
    bladeGain.gain.setValueAtTime(0.12, t);
    bladeGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    bladeOsc.connect(bladeGain);
    bladeGain.connect(this.sfxGain);

    bladeOsc.start(t);
    bladeOsc.stop(t + dur + 0.02);
  }

  /**
   * 7. playCrit() —— 天道暴击 · 雷霆重剑
   * 规范：60ms 极穿透力次低频震荡 (120Hz -> 35Hz 下砸) + 剑气撕裂高频 +
   * 紧随其后的三连高亢五声琶音 (A5 -> D6 -> F#6) 与清脆金石齐鸣
   */
  public playCrit(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;

    // 1. 次低频震荡冲击下砸 (120Hz -> 35Hz in 60ms)
    const slamOsc = ctx.createOscillator();
    slamOsc.type = "sine";
    slamOsc.frequency.setValueAtTime(120, t);
    slamOsc.frequency.exponentialRampToValueAtTime(35, t + 0.06);

    const slamGain = ctx.createGain();
    slamGain.gain.setValueAtTime(0.48, t);
    slamGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

    slamOsc.connect(slamGain);
    slamGain.connect(this.sfxGain);
    slamOsc.start(t);
    slamOsc.stop(t + 0.15);

    // 2. 剑气撕裂高频噪音破空
    const ripNoise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
    const ripData = ripNoise.getChannelData(0);
    for (let i = 0; i < ripData.length; i++) {
      ripData[i] = Math.random() * 2 - 1;
    }
    const ripSrc = ctx.createBufferSource();
    ripSrc.buffer = ripNoise;

    const ripFilter = ctx.createBiquadFilter();
    ripFilter.type = "bandpass";
    ripFilter.frequency.setValueAtTime(4500, t);
    ripFilter.Q.setValueAtTime(4.5, t);

    const ripGain = ctx.createGain();
    ripGain.gain.setValueAtTime(0.28, t);
    ripGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    ripSrc.connect(ripFilter);
    ripFilter.connect(ripGain);
    ripGain.connect(this.sfxGain);
    ripSrc.start(t);

    // 3. 三连高亢五声琶音与金石齐鸣 (A5 -> D6 -> F#6)
    const arpeggio = [
      { f: this.NOTES.A5, dt: 0.03 },
      { f: this.NOTES.D6, dt: 0.075 },
      { f: this.NOTES.Fs6, dt: 0.12 },
    ];
    arpeggio.forEach((note) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(note.f, t + note.dt);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.24, t + note.dt);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.dt + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t + note.dt);
      osc.stop(t + note.dt + 0.48);
    });

    // 4. 清脆金玉回荡
    this.playJadeChime(this.NOTES.D6, t + 0.08, 0.32);
  }

  /**
   * 8. playHit() / playMonsterAttack() —— 道身受击 · 护体罡气震荡
   * 规范：短促闷响，三角波从 190Hz 速降至 55Hz (110ms)，叠加 lowpass 600Hz 受击闷噪，干脆利落不刺耳
   */
  public playHit(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const dur = 0.11; // 110ms

    // 1. 罡气震荡低频 (三角波 190Hz -> 55Hz)
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);

    // 2. 600Hz 低通受击闷噪
    const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noiseSrc.start(t);
  }

  public playMonsterAttack(): void {
    this.playHit();
  }

  /**
   * 9. playConsume() / playItemDeduct() —— 灵石/丹药扣减 · 收入乾坤袋
   * 规范：轻巧双连下行玉珠音 (E6 -> A5，间隔 45ms)，干净利落，提供明确的资源变动正反馈
   */
  public playConsume(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const pearls = [
      { f: this.NOTES.E6, dt: 0 },
      { f: this.NOTES.A5, dt: 0.045 },
    ];

    pearls.forEach((p) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(p.f, t + p.dt);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, t + p.dt);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + p.dt + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t + p.dt);
      osc.stop(t + p.dt + 0.24);
    });
  }

  public playItemDeduct(): void {
    this.playConsume();
  }

  /**
   * 10. playError() / playInsufficient() —— 灵石/道具不足 · 禁制警示
   * 规范：拒绝刺耳电子警报！古琴“按音闷弦/禁制阻断”质感：
   * 两声短促低沉下行四度木质闷音 (E4 -> B3，间隔 90ms，带低通滤波阻尼感)
   */
  public playError(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const mutedNotes = [
      { f: this.NOTES.E4, dt: 0 },
      { f: this.NOTES.B3, dt: 0.09 },
    ];

    mutedNotes.forEach((item) => {
      const startTime = t + item.dt;

      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(item.f, startTime);

      // 低通滤波阻尼，模拟古琴手指按弦闷音
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(520, startTime);
      filter.frequency.exponentialRampToValueAtTime(140, startTime + 0.16);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.28, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.17);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.18);
    });
  }

  public playInsufficient(): void {
    this.playError();
  }

  /**
   * 额外修仙增益音效：服丹回春 (Healing Breath)
   */
  public playPillHeal(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    [this.NOTES.D5, this.NOTES.A5, this.NOTES.D6].forEach((f, idx) => {
      const noteTime = t + idx * 0.05;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, noteTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.16, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.38);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(noteTime);
      osc.stop(noteTime + 0.4);
    });
  }

  /**
   * 额外修仙增益音效：试炼凯旋仙音 (Victory Fanfare)
   */
  public playVictory(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const fanfare = [
      this.NOTES.D5,
      this.NOTES.Fs5,
      this.NOTES.A5,
      this.NOTES.D6,
      this.NOTES.Fs6,
    ];

    fanfare.forEach((f, idx) => {
      const noteTime = t + idx * 0.08;
      this.playPluckedZither(f, noteTime, 0.8, 0.45);
    });

    // 尾部玉磬悠扬
    this.playJadeChime(this.NOTES.D6, t + 0.42, 0.35);
  }
}

// 导出全局单例
export const xianxiaAudio = new XianxiaAudioEngine();
