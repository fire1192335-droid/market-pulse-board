export class TimedCache<T> {
  private value: T | null = null;
  private expiresAt = 0;

  constructor(private readonly ttlMs: number) {}

  get() {
    if (Date.now() >= this.expiresAt) {
      return null;
    }

    return this.value;
  }

  set(value: T) {
    this.value = value;
    this.expiresAt = Date.now() + this.ttlMs;
  }

  clear() {
    this.value = null;
    this.expiresAt = 0;
  }
}
