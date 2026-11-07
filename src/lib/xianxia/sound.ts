"use client";

/**
 * 仙途寻道 · 国风五声音阶合成器与游戏音效引擎 (Web Audio API)
 * 零外部音频文件依赖，纯浏览器原生实时合成：
 * 1. 古琴/古筝五声音阶 (宫商角徵羽) 洞天背景仙乐 (BGM)
 * 2. 点击、播种、灵泉、炼丹、铸剑打铁、飞剑斩击、暴击、受击、道具扣减等游戏音效 (SFX)
 */

class XianxiaSoundEngine {
  private ctx: AudioContext | null = null;
  private sfxEnabled: boolean = true;
  private bgmEnabled: boolean = false;
  private bgmTimer: ReturnType<typeof setInterval> | null = null;
  private bgmStep: number = 0;

  // 中国传统五声音阶频率 (C4 D4 E4 G4 A4 C5 D5 E5 G5 A5)
  private readonly PENTATONIC_NOTES = [
    261.63, // 宫 C4
    293.66, // 商 D4
    329.63, // 角 E4
    392.0,  // 徵 G4
    440.0,  // 羽 A4
    523.25, // 宫 C5
    587.33, // 商 D5
    659.25, // 角 E5
    783.99, // 徵 G5
    880.0,  // 羽 A5
  ];

  // 舒缓古琴曲谱序列 (索引对应 PENTATONIC_NOTES)
  private readonly MELODY_PATTERN = [
    4, 5, 7, 5, 4, 3, 2, 3,
    5, 7, 8, 7, 5, 4, 2, 0,
    2, 3, 4, 7, 5, 4, 3, 1,
    2, 4, 5, 3, 2, 1, 0, 0,
  ];

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public isBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  public setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  public toggleBgm(): boolean {
    if (this.bgmEnabled) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
    return this.bgmEnabled;
  }

  public startBgm(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.bgmEnabled = true;
    if (this.bgmTimer) clearInterval(this.bgmTimer);

    // 立即弹奏第一声古琴泛音
    this.playGuqinNote(this.PENTATONIC_NOTES[4], 1.8, 0.045);

    this.bgmTimer = setInterval(() => {
      if (!this.bgmEnabled) return;
      const noteIdx = this.MELODY_PATTERN[this.bgmStep % this.MELODY_PATTERN.length];
      const freq = this.PENTATONIC_NOTES[noteIdx];
      this.playGuqinNote(freq, 2.2, 0.04);

      // 每 4 拍伴奏一声低八度钟磬根音
      if (this.bgmStep % 4 === 0) {
        this.playGuqinNote(freq * 0.5, 3.2, 0.03);
      }
      this.bgmStep++;
    }, 950);
  }

  public stopBgm(): void {
    this.bgmEnabled = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  /**
   * 合成古琴/古筝拨弦泛音
   */
  private playGuqinNote(freq: number, duration: number, volume: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(freq, now);

    // 二倍频泛音营造古琴清越木质感
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  /**
   * 1. 通用按钮轻触：清脆白玉叩击音
   */
  public playClick(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1046.5, now); // C6
    osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.06); // E6

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * 2. 道具/灵石扣减提示音：清晰的双音消耗反馈
   */
  public playItemDeduct(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [659.25, 523.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.065);
      gain.gain.setValueAtTime(0.08, now + idx * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.065 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + 0.15);
    });
  }

  /**
   * 3. 灵田播种音效：木灵生发上扬琶音
   */
  public playPlant(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [392.0, 440.0, 523.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.07, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.24);
    });
  }

  /**
   * 4. 灵泉浇灌音效：清泉水滴泛音
   */
  public playWater(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [587.33, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const t = now + idx * 0.07;
      osc.frequency.setValueAtTime(freq * 0.85, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.15, t + 0.12);
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  /**
   * 5. 采药炼丹大成 (+HP)：仙音和弦共鸣
   */
  public playHarvest(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = now + idx * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.46);
    });
  }

  /**
   * 6. 天工铸剑打铁 + 仙剑嗡鸣音效
   */
  public playForge(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // 金铁交鸣声
    const osc = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

    mod.type = "square";
    mod.frequency.setValueAtTime(620, now);
    modGain.gain.setValueAtTime(240, now);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    mod.connect(modGain);
    modGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    mod.start(now);
    osc.stop(now + 0.56);
    mod.stop(now + 0.56);
  }

  /**
   * 7. 飞剑普攻破空斩击音
   */
  public playSwordSlash(isCrit = false): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isCrit ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(isCrit ? 920 : 680, now);
    osc.frequency.exponentialRampToValueAtTime(isCrit ? 180 : 220, now + (isCrit ? 0.24 : 0.16));

    gain.gain.setValueAtTime(isCrit ? 0.12 : 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isCrit ? 0.25 : 0.17));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isCrit ? 0.26 : 0.18));

    if (isCrit) {
      // 暴击附加清亮剑鸣泛音
      const chime = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chime.type = "sine";
      chime.frequency.setValueAtTime(1318.5, now + 0.03);
      chimeGain.gain.setValueAtTime(0.09, now + 0.03);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      chime.connect(chimeGain);
      chimeGain.connect(ctx.destination);
      chime.start(now + 0.03);
      chime.stop(now + 0.34);
    }
  }

  /**
   * 8. 妖兽反击/受击闷响
   */
  public playMonsterAttack(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.18);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * 9. 服用回春丹恢复气血音效
   */
  public playPillHeal(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25, 880.0].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const t = now + idx * 0.05;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  /**
   * 10. 战斗胜利凯旋仙音
   */
  public playVictory(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = now + idx * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.52);
    });
  }
}

export const xianxiaAudio = new XianxiaSoundEngine();
