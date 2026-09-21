import { describe, expect, it, vi } from 'vitest';
import { SpaceInputController } from './SpaceInputController';

describe('SpaceInputController', () => {
  it('ignores key repeat, prevents scroll only when focused, and forwards keydown/keyup while playing', () => {
    const inputTarget = new EventTarget();
    const blurTarget = new EventTarget();
    const onInput = vi.fn();
    const onPauseRequest = vi.fn();
    let focused = true;
    const controller = new SpaceInputController({
      inputTarget,
      blurTarget,
      isViewportFocused: () => focused,
      getGameState: () => 'playing',
      getSongPositionMs: () => 1234,
      onInput,
      onPauseRequest,
    });
    controller.start();

    const firstDown = createKeyEvent('keydown', { cancelable: true });
    inputTarget.dispatchEvent(firstDown);
    expect(firstDown.defaultPrevented).toBe(true);
    expect(onInput).toHaveBeenCalledWith({ type: 'keydown', songPositionMs: 1234 });

    const repeatDown = createKeyEvent('keydown', { repeat: true, cancelable: true });
    inputTarget.dispatchEvent(repeatDown);
    expect(onInput).toHaveBeenCalledTimes(1);

    focused = false;
    const up = createKeyEvent('keyup', { cancelable: true });
    inputTarget.dispatchEvent(up);
    expect(up.defaultPrevented).toBe(false);
    expect(onInput).toHaveBeenLastCalledWith({ type: 'keyup', songPositionMs: 1234 });
    controller.stop();
  });

  it('does not forward input outside playing state and requests pause on blur', () => {
    const inputTarget = new EventTarget();
    const blurTarget = new EventTarget();
    const onInput = vi.fn();
    const onPauseRequest = vi.fn();
    const controller = new SpaceInputController({
      inputTarget,
      blurTarget,
      getGameState: () => 'paused',
      getSongPositionMs: () => 500,
      onInput,
      onPauseRequest,
    });
    controller.start();

    inputTarget.dispatchEvent(createKeyEvent('keydown'));
    blurTarget.dispatchEvent(new Event('blur'));

    expect(onInput).not.toHaveBeenCalled();
    expect(onPauseRequest).toHaveBeenCalledTimes(1);
    controller.stop();
  });
});

function createKeyEvent(type: 'keydown' | 'keyup', options: { repeat?: boolean; cancelable?: boolean } = {}): Event {
  const event = new Event(type, { cancelable: options.cancelable ?? false });
  Object.defineProperty(event, 'code', { value: 'Space' });
  Object.defineProperty(event, 'repeat', { value: options.repeat ?? false });
  return event;
}
