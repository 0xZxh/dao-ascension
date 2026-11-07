"use client";

/**
 * 仙途寻道 · 国风五声音阶合成器与游戏音效引擎 (Web Audio API)
 * 零外部音频文件依赖，纯浏览器原生实时合成：
 * 1. 《御剑乘风·仙山晴雪》欢快轻灵仙侠背景音乐 (古筝/琵琶清脆轮指 + 竹笛颤音 + 玉磬轻拍，~142 BPM)
 * 2. 点击、播种、灵泉、炼丹、铸剑打铁、飞剑斩击、暴击、受击、道具扣减、道具不足警示等全套游戏音效 (SFX)
 */

class XianxiaSoundEngine {
  private ctx: AudioContext | null = null;
  private sfxEnabled: boolean = true;
  private bgmEnabled: boolean = false;
  private bgmTimer: ReturnType<typeof setInterval> | null = null;
  private bgmStep: number = 0;

  // 明亮欢快五声音阶频率表 (宫商角徵羽：C4 ~ E6)
  // 0:C4, 1:D4, 2:E4, 3:G4, 4:A4, 5:C5, 6:D5, 7:E5, 8:G5, 9:A5, 10:C6, 11:D6, 12:E6
  private readonly PENTATONIC_NOTES = [
    261.63,  // 0: 宫 C4
    293.66,  // 1: 商 D4
    329.63,  // 2: 角 E4
    392.00,  // 3: 徵 G4
    440.00,  // 4: 羽 A4
    523.25,  // 5: 宫 C5
    587.33,  // 6: 商 D5
    659.25,  // 7: 角 E5
    783.99,  // 8: 徵 G5
    880.00,  // 9: 羽 A5
    1046.50, // 10: 宫 C6
    1174.66, // 11: 商 D6
    1318.51, // 12: 角 E6
  ];

  // 《御剑乘风》32 拍欢快仙侠主旋律 (-1 表示休止或延音，其余对应 PENTATONIC_NOTES 索引)
  private readonly LIVELY_MELODY: number[] = [
    // 第一乐句：御剑出云（欢快上扬）
    5, 6, 7, 8,   9, 8, 7, 5,
    6, 7, 8, 6,   5, -1, 3, 4,
    // 第二乐句：仙山采薇（灵动跳跃）
    5, 7, 8, 9,   10, 9, 8, 7,
    8, 9, 10, 8,  7, -1, 8, 9,
    // 第三乐句：碧水流泉（高音清脆花指）
    10, 11, 12, 10, 9, 8, 7, 8,
    9, 8, 7, 5,   6, 7, 6, 3,
    // 第四乐句：归宗论道（圆满回落）
    4, 5, 7, 8,   9, 10, 8, 7,
    6, 7, 5, 3,   5, -1, 5, -1,
  ];

  // 低音伴奏根音序列 (每 4 个八分音符切换一次和声根音)
  private readonly BASS_PROGRESSION: number[] = [
    261.63, // C4
    261.63, // C4
    293.66, // D4
    196.00, // G3
    261.63, // C4
    220.00, // A3
    293.66, // D4
    196.00, // G3
    220.00, // A3
    196.00, // G3
    261.63, // C4
    293.66, // D4
    220.00, // A3
    196.00, // G3
    261.63, // C4
    261.63, // C4
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

  /**
   * 启动轻快仙侠背景音乐《御剑乘风》 (~142 BPM，210ms 八分音符律动)
   */
  public startBgm(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.bgmEnabled = true;
    if (this.bgmTimer) clearInterval(this.bgmTimer);

    // 立即弹奏欢快起手滑音和弦
    this.playGuzhengArpeggio([523.25, 659.25, 783.99, 1046.5], 0.035);

    this.bgmTimer = setInterval(() => {
      if (!this.bgmEnabled) return;

      const step = this.bgmStep % this.LIVELY_MELODY.length;
      const noteIdx = this.LIVELY_MELODY[step];

      // 1. 主旋律：清脆古筝/柳琴拨弦
      if (noteIdx >= 0) {
        const freq = this.PENTATONIC_NOTES[noteIdx];
        const isAccent = step % 4 === 0;
        this.playPluckNote(freq, isAccent ? 0.55 : 0.36, isAccent ? 0.048 : 0.036);

        // 逢乐句高潮点叠加竹笛清亮长音或古筝花指装饰音
        if (step % 8 === 4 && noteIdx >= 8) {
          this.playDiziFluteNote(freq, 0.55, 0.024);
        } else if (step % 8 === 0) {
          // 轻快倚音装饰
          const graceIdx = Math.min(this.PENTATONIC_NOTES.length - 1, noteIdx + 1);
          setTimeout(() => {
            if (this.bgmEnabled) {
              this.playPluckNote(this.PENTATONIC_NOTES[graceIdx], 0.22, 0.022);
            }
          }, 95);
        }
      }

      // 2. 律动低音与轻快伴奏弦：每 4 拍强拍落根音 + 玉磬轻击，每 2 拍反拍轻拨五度泛音
      const barIdx = Math.floor(step / 4) % this.BASS_PROGRESSION.length;
      const bassFreq = this.BASS_PROGRESSION[barIdx];

      if (step % 4 === 0) {
        this.playPluckNote(bassFreq, 0.65, 0.032);
        this.playJadePercussion(0.018);
      } else if (step % 4 === 2) {
        this.playPluckNote(bassFreq * 1.5, 0.35, 0.022);
        this.playJadePercussion(0.011);
      } else if (step % 2 === 1) {
        // 轻巧反拍伴奏音，赋予音乐轻快跳跃感
        this.playPluckNote(bassFreq * 2, 0.22, 0.015);
      }

      this.bgmStep++;
    }, 210);
  }

  public stopBgm(): void {
    this.bgmEnabled = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  /**
   * 合成清脆古筝/琵琶颗粒拨弦音
   */
  private playPluckNote(freq: number, duration: number, volume: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(freq, now);

    // 二倍频泛音增加丝竹清脆亮度
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.0001, now);
    // 极快起音模拟指尖拨弦颗粒感
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.01);
    osc2.stop(now + duration + 0.01);
  }

  /**
   * 合成仙侠竹笛（带轻微颤音 Vibrato）
   */
  private playDiziFluteNote(freq: number, duration: number, volume: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    // 5.5Hz 竹笛自然气息颤音
    vibrato.type = "sine";
    vibrato.frequency.setValueAtTime(5.5, now);
    vibratoGain.gain.setValueAtTime(4.5, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    vibrato.start(now);
    osc.stop(now + duration + 0.01);
    vibrato.stop(now + duration + 0.01);
  }

  /**
   * 古筝起手刮奏琶音
   */
  private playGuzhengArpeggio(freqs: number[], volume: number): void {
    freqs.forEach((f, idx) => {
      setTimeout(() => {
        if (this.bgmEnabled) {
          this.playPluckNote(f, 0.55, volume);
        }
      }, idx * 45);
    });
  }

  /**
   * 轻巧竹木/玉磬节拍点缀音
   */
  private playJadePercussion(volume: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1760, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.035);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
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
   * 2. 道具/灵石扣减提示音：清脆三连灵玉散落 + 消耗流转音效
   */
  public playItemDeduct(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // 清脆灵石/道具飞出三连音 (C6 -> G5 -> D5)
    [1046.5, 783.99, 587.33].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const chime = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.055;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);

      chime.type = "sine";
      chime.frequency.setValueAtTime(freq * 2, t);

      gain.gain.setValueAtTime(0.095, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      chime.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      chime.start(t);
      osc.stop(t + 0.17);
      chime.stop(t + 0.17);
    });
  }

  /**
   * 2b. 道具/灵石不足警示音：沉闷木鱼双叩 + 禁制回弹提示音
   */
  public playInsufficient(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [311.13, 207.65].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.11;

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.82, t + 0.12);

      sub.type = "triangle";
      sub.frequency.setValueAtTime(freq * 0.5, t);

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      sub.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      sub.start(t);
      osc.stop(t + 0.15);
      sub.stop(t + 0.15);
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
