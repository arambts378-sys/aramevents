'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';

const HEART_SPOTS = [
  { left: '8%', drift: '-14px', delay: '0ms' },
  { left: '30%', drift: '-4px', delay: '120ms' },
  { left: '52%', drift: '6px', delay: '60ms' },
  { left: '72%', drift: '14px', delay: '180ms' },
  { left: '44%', drift: '0px', delay: '260ms' },
];
const PET_COOLDOWN_MS = 2200;
const LONG_PRESS_MS = 450;
/** Back-and-forth strokes within this window count as petting */
const STROKE_WINDOW_MS = 1400;
const STROKES_TO_PET = 4;

interface Props {
  open: boolean;
  /** Hidden while the full robot is out (welcome, tip, exit survey), so there is only ever one robot */
  hidden: boolean;
  label: string;
  onToggle: () => void;
  onPet: () => void;
}

/** The robot's head as the chat button. It watches the cursor, and loves being petted. */
export function PetLauncher({ open, hidden, label, onToggle, onPet }: Props) {
  const faceRef = useRef<HTMLSpanElement>(null);
  const strokes = useRef<number[]>([]);
  const lastDirection = useRef(0);
  const lastPet = useRef(0);
  const pressTimer = useRef<number | null>(null);
  const skipClick = useRef(false);
  const [petting, setPetting] = useState(0); // bumps on every pet so the animation replays
  const [hearts, setHearts] = useState<number[]>([]);

  const pet = () => {
    const now = Date.now();
    if (now - lastPet.current < PET_COOLDOWN_MS) return;
    lastPet.current = now;
    strokes.current = [];
    setPetting((n) => n + 1);
    setHearts((h) => [...h, now]);
    window.setTimeout(() => setHearts((h) => h.filter((t) => t !== now)), 1600);
    onPet();
  };

  // Look toward the cursor, and count side-to-side strokes as petting.
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== 'mouse' || open) return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
    const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
    if (faceRef.current) faceRef.current.style.transform = `translate(${dx * 4}px, ${dy * 3}px) rotate(${dx * 12}deg)`;

    const direction = Math.sign(e.movementX);
    if (direction !== 0 && Math.abs(e.movementX) > 1 && direction !== lastDirection.current) {
      lastDirection.current = direction;
      const now = Date.now();
      strokes.current = [...strokes.current.filter((t) => now - t < STROKE_WINDOW_MS), now];
      if (strokes.current.length >= STROKES_TO_PET) pet();
    }
  };

  const relax = () => {
    if (faceRef.current) faceRef.current.style.transform = '';
    strokes.current = [];
  };

  // Touch: a long press is a pet, and does not also open the chat.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' || open) return;
    pressTimer.current = window.setTimeout(() => {
      skipClick.current = true;
      pet();
    }, LONG_PRESS_MS);
  };
  const cancelPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  return (
    <button
      type="button"
      onClick={() => {
        if (skipClick.current) {
          skipClick.current = false;
          return;
        }
        onToggle();
      }}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        relax();
        cancelPress();
      }}
      onPointerDown={onPointerDown}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={open ? `Close ${label}` : `Chat with ${label}`}
      aria-expanded={open}
      title={open ? undefined : `Chat with ${label}`}
      className={`group relative flex h-16 w-16 touch-manipulation select-none items-center justify-center rounded-full bg-white shadow-[0_16px_36px_-10px_rgba(23,20,42,0.55)] ring-1 ring-stage-ink/[0.08] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stage-violet focus-visible:ring-offset-2 ${
        hidden ? 'invisible' : ''
      }`}
    >
      {open ? (
        <span className="material-symbols-outlined text-[26px] text-stage-ink">keyboard_arrow_down</span>
      ) : (
        <>
          <span aria-hidden="true" className="assist-ping absolute inset-0 rounded-full ring-2 ring-stage-violet/40" />
          <span className="assist-float flex">
            <span key={petting} className={`flex ${petting ? 'assist-squish' : ''}`}>
              <span ref={faceRef} className="flex transition-transform duration-150 ease-out">
                <Image src="/aram-assist-head.webp" alt="" width={48} height={48} draggable={false} className="pointer-events-none" />
              </span>
            </span>
          </span>
          <span className="absolute right-1 top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#5EE7F0]" aria-hidden="true" />
          {hearts.map((id) =>
            HEART_SPOTS.map((s, i) => (
              <span
                key={`${id}-${i}`}
                aria-hidden="true"
                className="assist-heart pointer-events-none absolute top-0 text-[15px] text-[#FF5C93]"
                style={{ left: s.left, animationDelay: s.delay, ['--drift' as string]: s.drift }}
              >
                ♥
              </span>
            ))
          )}
        </>
      )}
    </button>
  );
}
