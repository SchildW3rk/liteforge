import { describe, it, expect, vi } from 'vitest';
import { signal } from '../src/signal.js';
import { effect } from '../src/effect.js';
import { onCleanup } from '../src/cleanup.js';

describe('effect', () => {
  describe('auto-subscription', () => {
    it('should run immediately', () => {
      const spy = vi.fn();
      effect(spy);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should auto-subscribe to signals read inside', () => {
      const count = signal(0);
      const spy = vi.fn();

      effect(() => {
        spy(count());
      });

      expect(spy).toHaveBeenCalledWith(0);

      count.set(1);
      expect(spy).toHaveBeenCalledWith(1);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should track multiple signals', () => {
      const a = signal(1);
      const b = signal(2);
      const spy = vi.fn();

      effect(() => {
        spy(a() + b());
      });

      expect(spy).toHaveBeenCalledWith(3);

      a.set(10);
      expect(spy).toHaveBeenCalledWith(12);

      b.set(20);
      expect(spy).toHaveBeenCalledWith(30);
    });

    it('should handle conditional dependencies', () => {
      const condition = signal(true);
      const a = signal(1);
      const b = signal(2);
      const spy = vi.fn();

      effect(() => {
        spy(condition() ? a() : b());
      });

      expect(spy).toHaveBeenCalledWith(1);

      // a should be tracked
      a.set(10);
      expect(spy).toHaveBeenCalledWith(10);

      // b is not tracked yet
      b.set(20);
      expect(spy).toHaveBeenCalledTimes(2);

      // Switch condition
      condition.set(false);
      expect(spy).toHaveBeenCalledWith(20);

      // Now b is tracked, a is not
      b.set(30);
      expect(spy).toHaveBeenCalledWith(30);

      a.set(100); // a no longer tracked
      expect(spy).toHaveBeenCalledTimes(4);
    });
  });

  describe('dispose', () => {
    it('should stop effect when disposed', () => {
      const count = signal(0);
      const spy = vi.fn();

      const dispose = effect(() => {
        spy(count());
      });

      expect(spy).toHaveBeenCalledTimes(1);

      dispose();

      count.set(1);
      count.set(2);

      expect(spy).toHaveBeenCalledTimes(1); // No more calls
    });

    it('should be safe to call dispose multiple times', () => {
      const count = signal(0);
      const spy = vi.fn();

      const dispose = effect(() => {
        spy(count());
      });

      dispose();
      dispose();
      dispose();

      count.set(1);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('should run cleanup before re-execution', () => {
      const count = signal(0);
      const order: string[] = [];

      effect(() => {
        const currentValue = count();
        order.push(`run:${currentValue}`);
        // Capture value at registration time for cleanup
        onCleanup(() => {
          order.push(`cleanup:${currentValue}`);
        });
      });

      expect(order).toEqual(['run:0']);

      count.set(1);
      // Cleanup runs with the captured value (0), then effect runs with new value (1)
      expect(order).toEqual(['run:0', 'cleanup:0', 'run:1']);

      count.set(2);
      expect(order).toEqual(['run:0', 'cleanup:0', 'run:1', 'cleanup:1', 'run:2']);
    });

    it('should run cleanup on dispose', () => {
      const cleanupSpy = vi.fn();

      const dispose = effect(() => {
        onCleanup(cleanupSpy);
      });

      expect(cleanupSpy).not.toHaveBeenCalled();

      dispose();
      expect(cleanupSpy).toHaveBeenCalledTimes(1);
    });

    it('should support returned cleanup function', () => {
      const count = signal(0);
      const cleanupSpy = vi.fn();

      const dispose = effect(() => {
        count(); // subscribe
        return cleanupSpy;
      });

      expect(cleanupSpy).not.toHaveBeenCalled();

      count.set(1);
      expect(cleanupSpy).toHaveBeenCalledTimes(1);

      count.set(2);
      expect(cleanupSpy).toHaveBeenCalledTimes(2);

      dispose();
      expect(cleanupSpy).toHaveBeenCalledTimes(3);
    });

    it('should support multiple onCleanup calls', () => {
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();
      const cleanup3 = vi.fn();

      const dispose = effect(() => {
        onCleanup(cleanup1);
        onCleanup(cleanup2);
        onCleanup(cleanup3);
      });

      dispose();

      expect(cleanup1).toHaveBeenCalledTimes(1);
      expect(cleanup2).toHaveBeenCalledTimes(1);
      expect(cleanup3).toHaveBeenCalledTimes(1);
    });
  });

  describe('nested effects', () => {
    it('should support nested effects with independent lifecycles', () => {
      const outer = signal(0);
      const inner = signal(0);
      const outerSpy = vi.fn();
      const innerSpy = vi.fn();

      effect(() => {
        outerSpy(outer());
        effect(() => {
          innerSpy(inner());
        });
      });

      expect(outerSpy).toHaveBeenCalledTimes(1);
      expect(innerSpy).toHaveBeenCalledTimes(1);

      inner.set(1);
      expect(outerSpy).toHaveBeenCalledTimes(1);
      expect(innerSpy).toHaveBeenCalledTimes(2);

      outer.set(1);
      // Outer re-runs, creating a NEW inner effect (but old inner is NOT triggered)
      // New inner runs once, reading current inner value (1)
      expect(outerSpy).toHaveBeenCalledTimes(2);
      expect(innerSpy).toHaveBeenCalledTimes(3);

      // Now both old and new inner effects are subscribed to `inner`
      inner.set(2);
      // Both inner effects run
      expect(innerSpy).toHaveBeenCalledTimes(5);
    });

    it('should allow deeply nested effects', () => {
      const a = signal(0);
      const b = signal(0);
      const c = signal(0);
      const spyA = vi.fn();
      const spyB = vi.fn();
      const spyC = vi.fn();

      effect(() => {
        spyA(a());
        effect(() => {
          spyB(b());
          effect(() => {
            spyC(c());
          });
        });
      });

      expect(spyA).toHaveBeenCalledTimes(1);
      expect(spyB).toHaveBeenCalledTimes(1);
      expect(spyC).toHaveBeenCalledTimes(1);

      c.set(1);
      expect(spyC).toHaveBeenCalledTimes(2);
      expect(spyB).toHaveBeenCalledTimes(1);
      expect(spyA).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should throw when onCleanup is called outside effect', () => {
      expect(() => {
        onCleanup(() => {});
      }).toThrow('onCleanup must be called inside an effect');
    });

    it('effect that throws on re-run does not silence other effects', () => {
      const src = signal(0);
      const good = vi.fn();
      const bad  = vi.fn(() => { if (src() > 0) throw new Error('bad effect'); });

      effect(bad);
      effect(() => { good(src()); });

      expect(() => src.set(1)).toThrow('bad effect');
      // good effect must have fired even though bad threw
      expect(good).toHaveBeenCalledWith(1);
    });

    it('cleanup is called before effect re-runs even when prior run threw', () => {
      const src = signal(0);
      const cleanupSpy = vi.fn();

      const dispose = effect(() => {
        onCleanup(cleanupSpy);
        if (src() > 1) throw new Error('late throw');
        src(); // track
      });

      src.set(1); // re-run normally — cleanup fires once
      expect(cleanupSpy).toHaveBeenCalledTimes(1);

      expect(() => src.set(2)).toThrow('late throw');
      // cleanup must have fired before the throwing run
      expect(cleanupSpy).toHaveBeenCalledTimes(2);
      dispose();
    });

    it('disposing an effect that previously threw is safe', () => {
      const src = signal(0);
      const dispose = effect(() => {
        if (src() > 0) throw new Error('oops');
      });

      expect(() => src.set(1)).toThrow('oops');
      expect(() => dispose()).not.toThrow(); // dispose must not re-throw
    });
  });
});
