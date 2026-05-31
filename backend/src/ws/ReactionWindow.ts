export const REACTION_TIMEOUT_MS = 30_000;

export class ReactionWindow {
  private timer: ReturnType<typeof setTimeout> | null = null;

  start(onTimeout: () => void, timeoutMs = REACTION_TIMEOUT_MS): void {
    this.clear();
    this.timer = setTimeout(() => {
      this.timer = null;
      onTimeout();
    }, timeoutMs);
  }

  clear(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  get isActive(): boolean {
    return this.timer !== null;
  }
}
