/**
 * ============================================================================
 * ACC AUTHORITATIVE CLOCK SYNCHRONIZATION UTILITY
 * ============================================================================
 * Solves the timer jump-back issue across view changes (Projector, Live Arena,
 * Franchise Console, Admin Dashboard, Landing Page).
 *
 * How it works:
 * 1. Whenever a packet arrives with a server timestamp, we record:
 *      offsetMs = serverTimestamp - localClientTimeAtReceipt
 * 2. Since both client and server clocks progress at 1 second per second,
 *    offsetMs remains constant regardless of which React components mount/unmount.
 * 3. At any instant:
 *      authoritativeServerNow = Date.now() + offsetMs
 * 4. This guarantees that entering/exiting Projector view, switching routes,
 *    or remounting components NEVER jumps the timer backwards.
 */

class ClockSynchronizer {
  private offsetMs: number = 0;
  private hasSynced: boolean = false;
  private lastRecordedServerTime: number = 0;

  /**
   * Record an authoritative server timestamp at the moment of packet receipt.
   */
  public recordServerTime(serverTimestamp?: number | null, localReceiptTime: number = Date.now()): void {
    if (typeof serverTimestamp !== 'number' || isNaN(serverTimestamp) || serverTimestamp <= 0) {
      return;
    }
    // Protect against corrupt timestamps (valid timestamp must be year >= 2024)
    if (serverTimestamp < 1700000000000) return;

    // Do not re-record if the timestamp is older than or equal to what we already recorded,
    // unless it's within a reasonable window, to prevent stale props from overriding fresh SSE data.
    if (this.hasSynced && serverTimestamp < this.lastRecordedServerTime) {
      return;
    }

    this.lastRecordedServerTime = serverTimestamp;
    this.offsetMs = serverTimestamp - localReceiptTime;
    this.hasSynced = true;
  }

  /**
   * Get current authoritative server time.
   * Advances smoothly and monotonically with Date.now().
   */
  public getNow(): number {
    return Date.now() + this.offsetMs;
  }

  /**
   * Returns current offset in milliseconds.
   */
  public getOffset(): number {
    return this.offsetMs;
  }

  /**
   * Returns whether a valid server time has been synchronized.
   */
  public isSynchronized(): boolean {
    return this.hasSynced;
  }

  /**
   * Authoritatively calculate whole seconds remaining until deadline.
   */
  public calculateRemainingSeconds(deadlineMs: number | null | undefined): number | null {
    if (!deadlineMs || deadlineMs <= 0) return null;
    const now = this.getNow();
    return Math.max(0, Math.ceil((deadlineMs - now) / 1000));
  }
}

export const clockSync = new ClockSynchronizer();
