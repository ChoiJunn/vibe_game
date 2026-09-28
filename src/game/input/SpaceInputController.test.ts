import { describe, expect, it, vi } from 'vitest';
import { SpaceInputController } from './SpaceInputController';

describe('SpaceInputController', () => {
  it('ignores key repeat, prevents scroll globally, and forwards keydown/keyup while playing', () => {
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
    expect(up.defaultPrevented).toBe(true);
    expect(onInput).toHaveBeenLastCalledWith({ type: 'keyup', songPositionMs: 1234 });
    controller.stop();
  });

  it('accepts global Space input but ignores buttons so UI controls remain usable', () => {
    const inputTarget = new EventTarget();
    const onInput = vi.fn();
    const controller = new SpaceInputController({
      inputTarget,
      getGameState: () => 'playing',
      getSongPositionMs: () => 1000,
      onInput,
      onPauseRequest: () => undefined,
    });
    controller.start();
    const button = { closest: () => ({}) } as unknown as EventTarget;
    const buttonDown = createKeyEvent('keydown', { cancelable: true });
    Object.defineProperty(buttonDown, 'target', { value: button });
    inputTarget.dispatchEvent(buttonDown);
    expect(onInput).not.toHaveBeenCalled();

    const globalDown = createKeyEvent('keydown', { cancelable: true });
    inputTarget.dispatchEvent(globalDown);
    expect(onInput).toHaveBeenCalledWith({ type: 'keydown', songPositionMs: 1000 });
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

  it('persists a matching keyup when the final judgement ends the run on keydown', async () => {
    const inputTarget = new EventTarget();
    const persisted: Array<{ clientSequence: number; type: string }> = [];
    let gameState = 'playing';
    const controller = new SpaceInputController({
      inputTarget,
      blurTarget: new EventTarget(),
      getGameState: () => gameState,
      getSongPositionMs: () => 1234,
      onInput: () => { gameState = 'failed'; },
      onPersistInput: ({ clientSequence, type }) => persisted.push({ clientSequence, type }),
      onPauseRequest: () => undefined,
    });
    controller.start();

    inputTarget.dispatchEvent(createKeyEvent('keydown'));
    const released = controller.waitForRelease();
    inputTarget.dispatchEvent(createKeyEvent('keyup'));
    await released;
    inputTarget.dispatchEvent(createKeyEvent('keydown'));
    inputTarget.dispatchEvent(createKeyEvent('keyup'));

    expect(persisted).toEqual([
      { clientSequence: 0, type: 'keydown' },
      { clientSequence: 1, type: 'keyup' },
    ]);
    controller.stop();
  });

  it('combines keyboard and touch sources into one held input until every source releases', async () => {
    const inputTarget = new EventTarget();
    const persisted: string[] = [];
    const controller = new SpaceInputController({
      inputTarget,
      blurTarget: new EventTarget(),
      getGameState: () => 'playing',
      getSongPositionMs: () => 500,
      onInput: ({ type }) => persisted.push(type),
      onPersistInput: ({ type }) => persisted.push(`persist:${type}`),
      onPauseRequest: () => undefined,
    });
    controller.start();

    inputTarget.dispatchEvent(createKeyEvent('keydown'));
    controller.press('touch:7');
    inputTarget.dispatchEvent(createKeyEvent('keyup'));
    const released = controller.waitForRelease();
    expect(persisted).toEqual(['persist:keydown', 'keydown']);

    controller.release('touch:7');
    await released;
    expect(persisted).toEqual(['persist:keydown', 'keydown', 'persist:keyup', 'keyup']);
    controller.release('touch:7');
    expect(persisted).toHaveLength(4);
    controller.stop();
  });

  it('releases a held touch exactly once when stopped', () => {
    const inputTarget = new EventTarget();
    const persisted: string[] = [];
    const controller = new SpaceInputController({
      inputTarget,
      getGameState: () => 'playing',
      getSongPositionMs: () => 500,
      onInput: ({ type }) => persisted.push(type),
      onPauseRequest: () => undefined,
    });
    controller.start();
    controller.press('touch:2');
    controller.stop();
    controller.stop();
    expect(persisted).toEqual(['keydown', 'keyup']);
  });

  it('sequences automatic misses with physical inputs without forwarding them as keys', () => {
    const inputTarget = new EventTarget();
    const persisted: Array<{ clientSequence: number; type: string; chartEventId?: string }> = [];
    const onInput = vi.fn();
    const controller = new SpaceInputController({
      inputTarget,
      blurTarget: new EventTarget(),
      getGameState: () => 'playing',
      getSongPositionMs: () => 1300,
      onInput,
      onPersistInput: (event) => persisted.push({
        clientSequence: event.clientSequence,
        type: event.type,
        chartEventId: event.chartEventId,
      }),
      initialSequence: 4,
      onPauseRequest: () => undefined,
    });
    controller.start();

    controller.recordAutomaticMiss('arrival-01', 979);
    inputTarget.dispatchEvent(createKeyEvent('keydown'));
    inputTarget.dispatchEvent(createKeyEvent('keyup'));

    expect(persisted).toEqual([
      { clientSequence: 4, type: 'auto-miss', chartEventId: 'arrival-01' },
      { clientSequence: 5, type: 'keydown', chartEventId: undefined },
      { clientSequence: 6, type: 'keyup', chartEventId: undefined },
    ]);
    expect(onInput.mock.calls.map(([event]) => event.type)).toEqual(['keydown', 'keyup']);
    controller.stop();
  });
});

function createKeyEvent(type: 'keydown' | 'keyup', options: { repeat?: boolean; cancelable?: boolean } = {}): Event {
  const event = new Event(type, { cancelable: options.cancelable ?? false });
  Object.defineProperty(event, 'code', { value: 'Space' });
  Object.defineProperty(event, 'repeat', { value: options.repeat ?? false });
  return event;
}
