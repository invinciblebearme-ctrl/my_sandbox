# Procedural sound effects and music for the educational ARPG (no samples, all synthesized).
# python3 tools/audio/synth.py [outRoot=models/edu]
#   -> <out>/public/audio/sfx/sfx_*.ogg, <out>/public/audio/bgm/bgm_*.ogg, <out>/audio-manifest.json
# Cute, bright chiptune-ish tone to match the art. Deterministic (fixed seeds).
import json, os, subprocess, sys, tempfile, wave
import numpy as np

SR = 32000
OUT = sys.argv[1] if len(sys.argv) > 1 else 'models/edu'
rng = np.random.default_rng(7)

# ---- primitives -------------------------------------------------------------------------------
def t_(d): return np.arange(int(SR * d)) / SR
def note(n): return 440.0 * 2 ** ((n - 69) / 12)  # MIDI note -> Hz
def phase(freq, d):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (int(SR * d),)) if np.ndim(freq) == 0 else np.asarray(freq)
    return 2 * np.pi * np.cumsum(f) / SR
def osc(kind, freq, d, duty=0.5):
    p = phase(freq, d)
    if kind == 'sine': return np.sin(p)
    if kind == 'square': return np.where((p / (2 * np.pi)) % 1 < duty, 1.0, -1.0) * 0.6
    if kind == 'saw': return (2 * ((p / (2 * np.pi)) % 1) - 1) * 0.6
    if kind == 'tri': return (2 * np.abs(2 * ((p / (2 * np.pi)) % 1) - 1) - 1)
    raise ValueError(kind)
def noise(d): return rng.uniform(-1, 1, int(SR * d))
def env(d, a=0.005, dcy=0.1, s=0.6, r=0.1):
    n = int(SR * d); e = np.zeros(n); t = t_(d)
    e = np.where(t < a, t / max(a, 1e-6), np.where(t < a + dcy, 1 - (1 - s) * (t - a) / max(dcy, 1e-6), s))
    rel = max(0, d - r)
    e = np.where(t > rel, e * np.clip(1 - (t - rel) / max(r, 1e-6), 0, 1), e)
    return e
def expdec(d, k=8): return np.exp(-k * t_(d))
def sweep(f0, f1, d, curve=1.0): x = t_(d) / d; return f0 + (f1 - f0) * x ** curve
def lowpass(x, cut):
    a = np.exp(-2 * np.pi * np.asarray(cut) / SR)
    a = np.broadcast_to(a, x.shape)
    y = np.zeros_like(x); acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y
def highpass(x, cut): return x - lowpass(x, cut)
def pad(x, d): n = int(SR * d); return np.concatenate([x, np.zeros(max(0, n - len(x)))])[:n] if len(x) < n else x[:n]
def mix(*parts, d=None):
    d = d or max(len(p) for p, _ in parts) / SR
    out = np.zeros(int(SR * d))
    for p, at in parts:
        i = int(SR * at); seg = p[: max(0, len(out) - i)]; out[i:i + len(seg)] += seg
    return out
def add(*xs): return mix(*[(x, 0) for x in xs])  # sum of sounds with different lengths
def tone(n_or_f, d, kind='square', vol=0.5, a=0.005, dcy=0.08, s=0.5, r=0.06, duty=0.5, vib=0.0):
    f = note(n_or_f) if n_or_f < 200 else n_or_f
    fr = f * (1 + vib * np.sin(2 * np.pi * 6 * t_(d))) if vib else f
    return osc(kind, fr, d, duty) * env(d, a, dcy, s, r) * vol
def arp(notes, step, kind='square', vol=0.4, **kw): return mix(*[(tone(n, step * 1.6, kind, vol, **kw), i * step) for i, n in enumerate(notes)])
def echo(x, delay=0.12, fb=0.35, n=3, keep=False):
    # keep=True keeps the length (music loops); otherwise the echo tail is added
    out = x.copy() if keep else np.concatenate([x, np.zeros(int(SR * delay * n))])
    for k in range(1, n + 1):
        i = int(SR * delay * k)
        if i >= len(out): break
        seg = x[: len(out) - i]; out[i:i + len(seg)] += seg * fb ** k
    return out

def save(path, x, peak=0.9):
    x = np.asarray(x, dtype=float)
    m = np.max(np.abs(x)) or 1
    x = x / m * peak
    fade = min(len(x), int(SR * 0.004)); x[-fade:] *= np.linspace(1, 0, fade)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: tmp = f.name
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', '4', path], check=True)
    os.remove(tmp)
    return round(len(x) / SR, 2)

# ---- sound effects ----------------------------------------------------------------------------
def hit(f=180, d=0.18, bright=3000):
    body = osc('sine', sweep(f * 2, f * 0.6, d, 0.5), d) * expdec(d, 18)
    crack = lowpass(noise(d), bright) * expdec(d, 40)
    return body * 0.8 + crack * 0.9
def whoosh(d=0.25, f0=600, f1=2200):
    n = noise(d); return (highpass(lowpass(n, sweep(f0, f1, d)), 300)) * np.sin(np.pi * t_(d) / d) ** 2
def sparkle(base=84, n=6, step=0.045, kind='sine'): return echo(mix(*[(tone(base + [0, 4, 7, 12, 16, 19, 24][i % 7], 0.12, kind, 0.35, dcy=0.05, s=0.2, r=0.05), i * step) for i in range(n)]), 0.09, 0.3)
def chime(notes, step=0.08, kind='tri', vol=0.5): return echo(arp(notes, step, kind, vol, dcy=0.15, s=0.3, r=0.12), 0.11, 0.3)
def step_snd(cut, d=0.08, k=45): return lowpass(noise(d), cut) * expdec(d, k)
def thud(f=70, d=0.35): return osc('sine', sweep(f * 1.8, f, d, 0.3), d) * expdec(d, 9) + lowpass(noise(d), 600) * expdec(d, 25) * 0.5
def zap(d=0.3): return osc('square', 900 + 500 * np.sign(np.sin(2 * np.pi * 37 * t_(d))) + rng.uniform(-200, 200, int(SR * d)), d, 0.3) * expdec(d, 6) * 0.5 + highpass(noise(d), 3000) * expdec(d, 10) * 0.4

SFX = {
    # quiz
    'quiz_popup': ('퀴즈 팝업 등장', lambda: mix((whoosh(0.18, 800, 3000) * 0.5, 0), (chime([72, 79, 84], 0.06), 0.08))),
    'quiz_select': ('보기 선택', lambda: tone(80, 0.08, 'square', 0.5, duty=0.25, dcy=0.03, s=0.2, r=0.03)),
    'quiz_correct': ('정답', lambda: chime([72, 76, 79, 84], 0.07, 'square', 0.4)),
    'quiz_wrong': ('오답', lambda: mix((tone(55, 0.22, 'square', 0.45, s=0.6, duty=0.3), 0), (tone(51, 0.34, 'square', 0.45, s=0.6, duty=0.3, vib=0.01), 0.18))),
    'quiz_perfect': ('퍼펙트', lambda: mix((chime([72, 76, 79, 84, 88, 91], 0.055, 'square', 0.4), 0), (sparkle(96, 8, 0.04), 0.3))),
    'quiz_tick': ('시간 임박 째깍', lambda: mix((tone(1600, 0.03, 'square', 0.4, dcy=0.01, s=0.1, r=0.01), 0), (tone(1200, 0.03, 'square', 0.3, dcy=0.01, s=0.1, r=0.01), 0.5), d=1.0)),
    'quiz_timeout': ('시간 초과', lambda: osc('tri', sweep(note(72), note(48), 0.6), 0.6) * env(0.6, 0.01, 0.1, 0.8, 0.2) * 0.6),
    'quiz_combo_up': ('콤보 상승', lambda: arp([76, 81, 88], 0.05, 'square', 0.4, duty=0.25)),
    'quiz_wisdom_burst': ('지혜 폭발', lambda: mix((osc('saw', sweep(110, 880, 0.8, 2), 0.8) * env(0.8, 0.3, 0.2, 0.8, 0.2) * 0.3, 0), (sparkle(84, 12, 0.05), 0.6), (thud(60, 0.8) * 0.6, 0.75))),
    # combat
    'sword_swing': ('검 휘두르기', lambda: whoosh(0.22, 400, 3000)),
    'hit_1': ('타격 1', lambda: hit(160)), 'hit_2': ('타격 2', lambda: hit(200, 0.16, 2500)), 'hit_3': ('타격 3', lambda: hit(140, 0.2, 3500)),
    'crit': ('치명타', lambda: mix((hit(120, 0.3, 4000), 0), (sparkle(91, 5, 0.03, 'square'), 0.03))),
    'arrow_shot': ('화살 발사', lambda: mix((tone(300, 0.06, 'tri', 0.6, dcy=0.03, s=0.1, r=0.02), 0), (whoosh(0.2, 1500, 4000) * 0.7, 0.02))),
    'cast_fire': ('마법 시전 (불)', lambda: lowpass(noise(0.6), sweep(400, 3000, 0.6)) * env(0.6, 0.05, 0.2, 0.7, 0.2) + osc('saw', sweep(100, 300, 0.6), 0.6) * expdec(0.6, 3) * 0.3),
    'cast_ice': ('마법 시전 (얼음)', lambda: mix((sparkle(96, 8, 0.035, 'tri'), 0), (highpass(noise(0.4), 5000) * expdec(0.4, 6) * 0.4, 0))),
    'cast_lightning': ('마법 시전 (번개)', lambda: zap(0.35)),
    'impact': ('착탄', lambda: thud(90, 0.4)),
    'shield_block': ('방패 막기', lambda: mix((osc('square', 520, 0.25, 0.3) * expdec(0.25, 14) * 0.5, 0), (osc('square', 785, 0.25, 0.4) * expdec(0.25, 16) * 0.35, 0), (lowpass(noise(0.1), 2000) * expdec(0.1, 50), 0))),
    # player
    'step_grass': ('발소리 (풀)', lambda: step_snd(1800)), 'step_stone': ('발소리 (돌)', lambda: step_snd(5000, 0.05, 70)), 'step_wood': ('발소리 (나무)', lambda: step_snd(900, 0.07) + osc('sine', 220, 0.07) * expdec(0.07, 50) * 0.5),
    'player_hit': ('플레이어 피격', lambda: mix((hit(220, 0.15), 0), (osc('square', sweep(600, 300, 0.15), 0.15, 0.3) * expdec(0.15, 12) * 0.3, 0))),
    'player_down': ('플레이어 쓰러짐', lambda: mix((arp([67, 64, 60, 55], 0.12, 'tri', 0.5), 0), (sparkle(84, 6, 0.06), 0.5))),
    'level_up': ('레벨업', lambda: mix((chime([60, 64, 67, 72, 76, 79, 84], 0.07, 'square', 0.35), 0), (sparkle(96, 8, 0.05), 0.5))),
    'potion_drink': ('물약 마시기', lambda: mix(*[(osc('sine', sweep(300 + i * 60, 600 + i * 60, 0.09), 0.09) * env(0.09, 0.01, 0.03, 0.5, 0.03) * 0.6, i * 0.13) for i in range(3)], (sparkle(88, 4, 0.04), 0.42))),
    # monsters
    'monster_attack': ('몬스터 공격', lambda: whoosh(0.18, 300, 1500) + osc('square', sweep(200, 120, 0.18), 0.18, 0.3) * expdec(0.18, 8) * 0.3),
    'monster_hit': ('몬스터 피격', lambda: mix((hit(260, 0.14), 0), (osc('square', sweep(700, 900, 0.1), 0.1, 0.25) * expdec(0.1, 20) * 0.3, 0))),
    'monster_vanish': ('몬스터 소멸 (빛 조각)', lambda: mix((osc('tri', sweep(note(84), note(96), 0.3), 0.3) * expdec(0.3, 5) * 0.4, 0), (sparkle(91, 8, 0.035), 0.05))),
    'slime_hop': ('슬라임 통통', lambda: osc('sine', sweep(180, 420, 0.12, 0.5), 0.12) * env(0.12, 0.005, 0.04, 0.5, 0.05) * 0.8),
    'boss_roar': ('보스 포효', lambda: lowpass(osc('saw', 70 + 8 * np.sin(2 * np.pi * 9 * t_(1.2)), 1.2) + noise(1.2) * 0.4, 900) * env(1.2, 0.15, 0.3, 0.8, 0.4)),
    'boss_phase': ('보스 페이즈 전환', lambda: mix((osc('saw', sweep(60, 240, 1.0, 2), 1.0) * env(1.0, 0.3, 0.2, 0.8, 0.2) * 0.4, 0), (thud(50, 0.8), 0.9))),
    # items
    'drop_common': ('드랍 (일반)', lambda: tone(72, 0.1, 'tri', 0.5)),
    'drop_magic': ('드랍 (마법)', lambda: arp([72, 79], 0.06, 'tri', 0.5)),
    'drop_rare': ('드랍 (희귀)', lambda: chime([72, 76, 79], 0.06)),
    'drop_legendary': ('드랍 (전설)', lambda: mix((chime([72, 76, 79, 84, 88], 0.07, 'square', 0.35), 0), (osc('sine', note(48), 1.2) * env(1.2, 0.05, 0.3, 0.5, 0.6) * 0.4, 0), (sparkle(96, 10, 0.05), 0.3))),
    'pickup': ('줍기', lambda: arp([79, 84], 0.04, 'square', 0.4, duty=0.25)),
    'equip': ('장착', lambda: mix((osc('square', 400, 0.08, 0.3) * expdec(0.08, 30) * 0.5, 0), (osc('square', 600, 0.12, 0.3) * expdec(0.12, 25) * 0.5, 0.06))),
    'gold': ('골드', lambda: mix(*[(osc('square', 1900 + i * 300, 0.1, 0.3) * expdec(0.1, 25) * 0.4, i * 0.05) for i in range(3)])),
    'inventory_move': ('인벤토리 이동', lambda: add(lowpass(noise(0.07), 3000) * expdec(0.07, 50), tone(67, 0.05, 'tri', 0.3))),
    # ui
    'ui_click': ('버튼 클릭', lambda: tone(1000, 0.04, 'square', 0.4, duty=0.25, dcy=0.02, s=0.1, r=0.02)),
    'ui_hover': ('버튼 올리기', lambda: tone(1400, 0.025, 'sine', 0.3, dcy=0.01, s=0.1, r=0.01)),
    'ui_open': ('창 열기', lambda: mix((whoosh(0.12, 600, 2500) * 0.4, 0), (arp([72, 79], 0.04, 'tri', 0.4), 0.03))),
    'ui_close': ('창 닫기', lambda: mix((whoosh(0.12, 2500, 600) * 0.4, 0), (arp([79, 72], 0.04, 'tri', 0.4), 0.03))),
    'ui_error': ('오류 (공간 부족 등)', lambda: mix((tone(45, 0.1, 'square', 0.4, duty=0.4), 0), (tone(45, 0.1, 'square', 0.4, duty=0.4), 0.13))),
    'quest_complete': ('퀘스트 완료', lambda: chime([67, 72, 76, 79, 84], 0.09, 'square', 0.35)),
    # environment
    'chest_open': ('상자 열기', lambda: mix((osc('saw', sweep(120, 90, 0.35), 0.35) * env(0.35, 0.02, 0.1, 0.6, 0.1) * 0.25, 0), (chime([72, 76, 79, 84, 91], 0.06, 'tri'), 0.3))),
    'door_open': ('문 열기', lambda: add(lowpass(osc('saw', 80 + 30 * np.sin(2 * np.pi * 3 * t_(0.8)), 0.8), 600) * env(0.8, 0.05, 0.2, 0.7, 0.2) * 0.6, thud(60, 0.3) * 0.3)),
    'door_unlock': ('잠금 해제', lambda: mix((osc('square', 1800, 0.05, 0.3) * expdec(0.05, 60), 0), (osc('square', 1400, 0.06, 0.3) * expdec(0.06, 50), 0.1), (chime([79, 84], 0.05), 0.2))),
    'stairs': ('계단 (다음 층)', lambda: mix(*[(step_snd(2500, 0.06), i * 0.12) for i in range(4)], (chime([60, 67, 72], 0.1, 'tri'), 0.5))),
    'portal': ('포탈', lambda: osc('sine', 300 + 120 * np.sin(2 * np.pi * 2 * t_(1.2)), 1.2) * env(1.2, 0.2, 0.2, 0.7, 0.4) * 0.5 + lowpass(noise(1.2), 1200) * env(1.2, 0.2, 0.2, 0.5, 0.4) * 0.3),
    'pot_break': ('항아리 깨기', lambda: mix((lowpass(noise(0.3), 5000) * expdec(0.3, 14), 0), *[(osc('square', 1800 + i * 450, 0.08, 0.3) * expdec(0.08, 40) * 0.3, 0.02 + i * 0.04) for i in range(3)])),
    # skills (extra)
    'skill_whirlwind': ('회전베기', lambda: mix(*[(whoosh(0.2, 500, 2500) * 0.8, i * 0.18) for i in range(3)])),
    'skill_ground_slam': ('대지 강타', lambda: mix((thud(55, 0.7), 0), (lowpass(noise(0.6), 1500) * expdec(0.6, 6) * 0.5, 0.02))),
    'skill_heal': ('회복', lambda: mix((chime([67, 71, 74, 79], 0.1, 'sine', 0.5), 0), (sparkle(91, 6, 0.06), 0.2))),
    'skill_teleport': ('순간이동', lambda: add(osc('sine', sweep(200, 1600, 0.4, 2), 0.4) * env(0.4, 0.01, 0.1, 0.6, 0.15) * 0.5, sparkle(96, 4, 0.04) * 0.6)),
    'skill_arrow_rain': ('화살비', lambda: mix(*[(whoosh(0.15, 2000, 4000) * 0.5, i * 0.09) for i in range(8)], *[(hit(300, 0.08, 4000) * 0.3, 0.5 + i * 0.09) for i in range(6)])),
    'skill_meteor': ('유성', lambda: mix((lowpass(noise(1.0), sweep(300, 2500, 1.0, 2)) * np.linspace(0.1, 1, int(SR * 1.0)) * 0.6, 0), (thud(45, 1.0), 0.95))),
    'skill_buff': ('버프 (함성·보호막)', lambda: mix((osc('saw', sweep(220, 440, 0.4), 0.4) * env(0.4, 0.05, 0.1, 0.6, 0.15) * 0.3, 0), (chime([69, 76, 81], 0.06, 'square', 0.3), 0.15))),
}

# ---- music ------------------------------------------------------------------------------------
DRUM_KICK = lambda: thud(60, 0.25) * 0.9
DRUM_SNARE = lambda: highpass(noise(0.15), 1500) * expdec(0.15, 22) * 0.5 + osc('tri', 190, 0.15) * expdec(0.15, 30) * 0.3
DRUM_HAT = lambda: highpass(noise(0.04), 7000) * expdec(0.04, 90) * 0.25
CHORDS = {'I': [0, 4, 7], 'ii': [2, 5, 9], 'iii': [4, 7, 11], 'IV': [5, 9, 12], 'V': [7, 11, 14], 'vi': [9, 12, 16], 'i': [0, 3, 7], 'iv': [5, 8, 12], 'v': [7, 10, 14], 'VI': [8, 12, 15], 'VII': [10, 14, 17], 'III': [3, 7, 10]}

def song(root, prog, bpm, bars_per_chord=1, loops=2, lead='square', pad_kind='tri', drums='full', melody_seed=1, swing=0.0, bass=True, arp_kind='square', vol_lead=0.28, minor=False, lead_oct=12):
    beat = 60 / bpm; bar = beat * 4
    total = bar * bars_per_chord * len(prog) * loops
    out = np.zeros(int(SR * (total + 2)))
    def put(x, at):
        i = int(SR * at); seg = x[: max(0, len(out) - i)]; out[i:i + len(seg)] += seg
    mrng = np.random.default_rng(melody_seed)
    scale = [0, 2, 3, 5, 7, 8, 10] if minor else [0, 2, 4, 5, 7, 9, 11]
    phrase = []  # a melody phrase per chord, repeated across loops so it sounds composed
    for ci, ch in enumerate(prog):
        notes = []
        for k in range(8 * bars_per_chord):
            if mrng.random() < 0.25: notes.append(None); continue
            tones = CHORDS[ch] if k % 2 == 0 else [scale[mrng.integers(0, 7)]]
            notes.append(tones[mrng.integers(0, len(tones))])
        phrase.append(notes)
    for lp in range(loops):
        for ci, ch in enumerate(prog):
            t0 = (lp * len(prog) + ci) * bar * bars_per_chord
            dur = bar * bars_per_chord
            chord = [root + n for n in CHORDS[ch]]
            for n in chord: put(tone(n, dur, pad_kind, 0.09, a=0.08, dcy=0.3, s=0.6, r=0.3), t0)  # pad
            if bass:
                for b in range(4 * bars_per_chord):
                    put(tone(root - 12 + CHORDS[ch][0] + (7 if b % 2 else 0), beat * 0.9, 'tri', 0.35, dcy=0.1, s=0.6, r=0.05), t0 + b * beat)
            for k in range(8 * bars_per_chord):  # arpeggio 8ths
                n = chord[k % 3] + 12
                put(tone(n, beat * 0.45, arp_kind, 0.07, duty=0.25, dcy=0.05, s=0.3, r=0.04), t0 + k * beat / 2 + (swing * beat / 2 if k % 2 else 0))
            for k, n in enumerate(phrase[ci]):  # lead melody 8ths
                if n is None: continue
                put(tone(root + lead_oct + n, beat * 0.5, lead, vol_lead, duty=0.5, dcy=0.08, s=0.5, r=0.06, vib=0.004), t0 + k * beat / 2 + (swing * beat / 2 if k % 2 else 0))
            if drums != 'none':
                for b in range(4 * bars_per_chord):
                    tb = t0 + b * beat
                    if drums in ('full', 'march') and b % 2 == 0: put(DRUM_KICK(), tb)
                    if drums == 'full' and b % 2 == 1: put(DRUM_SNARE(), tb)
                    if drums == 'march' and b % 4 == 3: put(DRUM_SNARE(), tb)
                    for hh in range(2): put(DRUM_HAT(), tb + hh * beat / 2)
                    if drums == 'soft' and b % 4 == 0: put(DRUM_KICK() * 0.5, tb)
    out = out[: int(SR * total)]
    return echo(out, beat * 0.75, 0.18, 2, keep=True)

def quiz_loop():  # tense short loop: ticking + rising ostinato
    bpm = 132; beat = 60 / bpm; total = beat * 16
    out = np.zeros(int(SR * total))
    def put(x, at):
        i = int(SR * at); seg = x[: max(0, len(out) - i)]; out[i:i + len(seg)] += seg
    seq = [57, 60, 64, 60, 57, 60, 65, 60, 57, 60, 64, 60, 59, 62, 65, 62]
    for i in range(32): put(tone(seq[i % 16] + (12 if i >= 16 else 0), beat * 0.45, 'square', 0.12, duty=0.25), i * beat / 2)
    for b in range(16):
        put(tone(45 if b < 8 else 47, beat * 0.9, 'tri', 0.35), b * beat)
        put(tone(1600 if b % 2 == 0 else 1200, 0.03, 'square', 0.1, dcy=0.01, s=0.1, r=0.01), b * beat)
    return out

def jingle(notes, step, kind='square', tail=1.0, minor=False):
    x = arp(notes, step, kind, 0.4, dcy=0.12, s=0.5, r=0.1)
    chord = notes[-3:] if len(notes) >= 3 else notes
    x = mix((x, 0), *[(tone(n, tail + 0.6, 'tri', 0.2, a=0.02, dcy=0.3, s=0.6, r=0.5), step * len(notes)) for n in chord])
    return echo(x, 0.15, 0.3)

BGM = {
    'title': ('타이틀', lambda: song(60, ['I', 'vi', 'IV', 'V'], 96, 2, 2, 'square', drums='soft', melody_seed=3)),
    'village': ('등불 마을', lambda: song(65, ['I', 'IV', 'ii', 'V'], 88, 2, 2, 'tri', drums='soft', melody_seed=11, swing=0.25)),
    'stage1_forest': ('속삭이는 숲 (탐험)', lambda: song(62, ['I', 'iii', 'IV', 'I'], 104, 2, 2, 'square', drums='full', melody_seed=5)),
    'stage2_library': ('무너진 대도서관 (탐험)', lambda: song(57, ['i', 'VI', 'III', 'VII'], 96, 2, 2, 'tri', drums='soft', melody_seed=21, minor=True)),
    'stage3_clocktower': ('얼어붙은 시계탑 (탐험)', lambda: song(64, ['i', 'iv', 'VI', 'v'], 112, 2, 2, 'square', drums='march', melody_seed=31, minor=True, arp_kind='tri')),
    'stage4_abyss': ('망각의 심연 (탐험)', lambda: song(50, ['i', 'VI', 'iv', 'v'], 84, 2, 2, 'saw', drums='soft', melody_seed=41, minor=True, vol_lead=0.18)),
    'boss': ('보스전', lambda: song(52, ['i', 'VI', 'VII', 'i'], 144, 1, 4, 'saw', drums='full', melody_seed=51, minor=True, vol_lead=0.2)),
    'final_boss': ('최종 보스전', lambda: song(49, ['i', 'iv', 'VI', 'v', 'i', 'VII', 'VI', 'v'], 150, 1, 2, 'saw', drums='full', melody_seed=61, minor=True, vol_lead=0.2)),
    'quiz_loop': ('퀴즈 팝업 대기 루프', quiz_loop),
    'jingle_victory': ('승리 징글', lambda: jingle([67, 72, 76, 79, 84, 88], 0.11)),
    'jingle_gameover': ('게임 오버 징글', lambda: jingle([72, 71, 67, 64, 60, 59, 55], 0.16, 'tri')),
}

if __name__ == '__main__':
    only = set(sys.argv[2:])
    manifest = {'sfx': {}, 'bgm': {}}
    for name, (label, fn) in SFX.items():
        if only and name not in only: continue
        manifest['sfx'][name] = {'label': label, 'file': f'audio/sfx/sfx_{name}.ogg', 'seconds': save(f'{OUT}/public/audio/sfx/sfx_{name}.ogg', fn())}
    for name, (label, fn) in BGM.items():
        if only and name not in only: continue
        loop = not name.startswith('jingle')
        manifest['bgm'][name] = {'label': label, 'file': f'audio/bgm/bgm_{name}.ogg', 'seconds': save(f'{OUT}/public/audio/bgm/bgm_{name}.ogg', fn(), 0.8), 'loop': loop}
    if not only:
        with open(f'{OUT}/audio-manifest.json', 'w') as f: json.dump(manifest, f, ensure_ascii=False, indent=2)
    print('sfx', len(manifest['sfx']), 'bgm', len(manifest['bgm']))
