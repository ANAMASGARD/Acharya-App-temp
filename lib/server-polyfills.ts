/**
 * Minimal polyfills for EAS Hosting / edge workers (no browser DOM APIs).
 * pdf-parse pulls in canvas code that expects DOMMatrix at module load time.
 */
if (typeof globalThis.DOMMatrix === "undefined") {
  class DOMMatrixPolyfill {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;

    constructor(init?: string | readonly number[]) {
      if (Array.isArray(init) && init.length >= 6) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
      }
    }

    multiply(): this {
      return this;
    }

    translate(): this {
      return this;
    }

    scale(): this {
      return this;
    }

    inverse(): this {
      return this;
    }
  }

  globalThis.DOMMatrix = DOMMatrixPolyfill as unknown as typeof DOMMatrix;
}
