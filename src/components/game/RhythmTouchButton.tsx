"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useCoarsePointer(): boolean {
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => setIsCoarsePointer(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isCoarsePointer;
}

export function RhythmTouchButton({ onPress, onRelease, disabled = false }: {
  onPress: (source: string) => void;
  onRelease: (source: string) => void;
  disabled?: boolean;
}) {
  const activePointer = useRef<number | null>(null);
  const onReleaseRef = useRef(onRelease);
  const [isPressed, setIsPressed] = useState(false);
  useEffect(() => { onReleaseRef.current = onRelease; }, [onRelease]);
  const source = (pointerId: number) => `touch:${pointerId}`;

  const releaseActivePointer = useCallback((expectedPointerId?: number, notifyRelease = true) => {
    const pointerId = activePointer.current;
    if (pointerId === null || (expectedPointerId !== undefined && pointerId !== expectedPointerId)) return;
    activePointer.current = null;
    setIsPressed(false);
    if (notifyRelease) onReleaseRef.current(source(pointerId));
  }, []);

  useEffect(() => () => releaseActivePointer(undefined, true), [releaseActivePointer]);
  useEffect(() => {
    if (disabled) releaseActivePointer();
  }, [disabled, releaseActivePointer]);

  return <button
    type="button"
    className="rhythm-touch-button"
    aria-label="리듬 입력 길게 누르기"
    aria-pressed={isPressed}
    disabled={disabled}
    onPointerDown={(event) => {
      if (disabled || activePointer.current !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
      event.preventDefault();
      activePointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsPressed(true);
      onPress(source(event.pointerId));
      event.currentTarget.dataset.pressed = "true";
    }}
    onPointerUp={(event) => {
      event.preventDefault();
      releaseActivePointer(event.pointerId);
      event.currentTarget.dataset.pressed = "false";
    }}
    onPointerCancel={(event) => {
      releaseActivePointer(event.pointerId);
      event.currentTarget.dataset.pressed = "false";
    }}
    onLostPointerCapture={(event) => {
      releaseActivePointer(event.pointerId);
      event.currentTarget.dataset.pressed = "false";
    }}
  >
    <span className="rhythm-touch-button__key" aria-hidden="true">SPACE</span>
    <span>리듬 입력</span>
  </button>;
}
