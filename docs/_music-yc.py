#!/usr/bin/env python3
"""Synthesise the YC demo's background score — a 180-second ambient pad.

Four chord changes (Dm9 → Fmaj9 → Am11 → Cmaj9), each sustained ~15 seconds, looped
three times (≈180 s). Each note is a lightly detuned sine with its first two harmonics
and a slow tremolo, so the bed sounds like a soft synth pad rather than a test tone.
Stereo width comes from a small per-voice delay; a slight fade in and out keeps the
music from clipping the voice. 48 kHz / 16-bit WAV, no external libraries.
"""
import math, struct, wave, sys
from pathlib import Path

SR = 48_000
TARGET = 180.0  # seconds
AMP = 0.055     # peaks around -25 dB, well under the voice bed

# Chord voicings (in Hz). Low octave for a round, warm pad.
CHORDS = [
    [146.83, 174.61, 220.00, 261.63, 329.63],   # Dm9: D F A C E
    [174.61, 220.00, 261.63, 329.63, 392.00],   # Fmaj9: F A C E G
    [220.00, 246.94, 329.63, 392.00, 493.88],   # Am11: A B E G B
    [261.63, 329.63, 392.00, 493.88, 587.33],   # Cmaj9: C E G B D
]
CHORD_DUR = TARGET / (3 * len(CHORDS))   # three loops of four chords

def voice(freq, i, phase_l, phase_r):
    """A lightly detuned sine with two harmonics; returns the next left/right samples."""
    # Three detuned fundamentals for a chorused feel; harmonics quieter for warmth.
    l = (math.sin(phase_l) + 0.35 * math.sin(2 * phase_l) + 0.12 * math.sin(3 * phase_l)) / 1.47
    r = (math.sin(phase_r) + 0.35 * math.sin(2 * phase_r) + 0.12 * math.sin(3 * phase_r)) / 1.47
    return l, r

def tremolo(t):
    """Slow amplitude wobble so the pad breathes."""
    return 0.9 + 0.1 * math.sin(2 * math.pi * 0.18 * t)

def chord_env(t_in_chord):
    """Gentle crossfade between chords: ramp in over 2 s, hold, ramp out over 2 s."""
    ramp = 2.0
    if t_in_chord < ramp:
        return (t_in_chord / ramp) ** 1.5
    tail = CHORD_DUR - t_in_chord
    if tail < ramp:
        return (tail / ramp) ** 1.5
    return 1.0

def master_env(t):
    """Fade the whole piece in and out so it never cuts hard."""
    fade = 4.0
    if t < fade:
        return (t / fade)
    tail = TARGET - t
    if tail < fade:
        return max(0.0, tail / fade)
    return 1.0

def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/video/.tmp/music.wav")
    out.parent.mkdir(parents=True, exist_ok=True)
    N = int(SR * TARGET)
    print(f"synthesising {TARGET:.0f}s · {N} samples per channel → {out}", flush=True)

    # Pre-compute per-voice phase increments for each chord (left and right slightly detuned).
    chord_data = []
    for chord in CHORDS:
        voices = []
        for i, f in enumerate(chord):
            dl = f * (1 + (i - 2) * 0.0005)   # ±0.1 % detune, spread across voices
            dr = f * (1 - (i - 2) * 0.0005)
            voices.append((2 * math.pi * dl / SR, 2 * math.pi * dr / SR))
        chord_data.append(voices)

    with wave.open(str(out), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        buf = bytearray()
        phases = [[(0.0, (i * 0.37) % (2 * math.pi)) for i in range(5)] for _ in CHORDS]
        for n in range(N):
            t = n / SR
            # Which chord slot is active (loops after four).
            ci = int(t / CHORD_DUR) % len(CHORDS)
            t_in = (t % CHORD_DUR)
            env = chord_env(t_in) * master_env(t) * tremolo(t)
            l = r = 0.0
            voices = chord_data[ci]
            for i, (dl, dr) in enumerate(voices):
                pl, pr = phases[ci][i]
                sl, sr = voice(voices[i], i, pl, pr)
                l += sl; r += sr
                phases[ci][i] = ((pl + dl) % (2 * math.pi), (pr + dr) % (2 * math.pi))
            l *= AMP * env / 1.6
            r *= AMP * env / 1.6
            # Soft limiter so a brief chord overlap never clips.
            l = math.tanh(l * 1.1) * 0.9
            r = math.tanh(r * 1.1) * 0.9
            buf += struct.pack("<hh", int(l * 32767), int(r * 32767))
            if n % (SR * 10) == 0 and n > 0:
                print(f"  {n // SR:>3}s", flush=True)
        w.writeframes(bytes(buf))
    print("done")

if __name__ == "__main__":
    main()
