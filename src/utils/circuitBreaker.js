/**
 * Prompt 03 Optimization: Production Circuit Breaker
 * Protects Rankly.ai from slow/failing external dependencies (AI Providers, SMTP, External APIs)
 * Fast-fails when a service degrades, preventing connection pool exhaustion and app hangs.
 */
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 3; // Trip after 3 consecutive failures
    this.resetTimeout = options.resetTimeout || 30000;      // 30s before testing recovery
    this.timeout = options.timeout || 4000;                 // 4s timeout per request
    this.state = 'CLOSED';                                  // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.stats = { totalCalls: 0, successfulCalls: 0, failedCalls: 0, fastFails: 0 };
  }

  async execute(action, fallback = null) {
    this.stats.totalCalls++;

    // 1. Check if Circuit is OPEN
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        console.log(`⚡ [CircuitBreaker:${this.name}] Testing recovery... transitioning to HALF_OPEN.`);
      } else {
        this.stats.fastFails++;
        console.warn(`⚡ [CircuitBreaker:${this.name}] Fast-failing (Circuit is OPEN). Serving fallback.`);
        if (typeof fallback === 'function') {
          return fallback(new Error(`Circuit breaker for ${this.name} is OPEN`));
        }
        if (fallback !== null) return fallback;
        throw new Error(`Circuit breaker for ${this.name} is OPEN - external dependency unavailable.`);
      }
    }

    // 2. Execute with strict timeout guard
    let timer;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Dependency ${this.name} timed out after ${this.timeout}ms`));
        }, this.timeout);
      });

      const result = await Promise.race([action(), timeoutPromise]);
      clearTimeout(timer);

      this.onSuccess();
      return result;
    } catch (err) {
      if (timer) clearTimeout(timer);
      this.onFailure(err);

      if (typeof fallback === 'function') {
        return fallback(err);
      }
      if (fallback !== null) {
        return fallback;
      }
      throw err;
    }
  }

  onSuccess() {
    this.stats.successfulCalls++;
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      console.log(`✅ [CircuitBreaker:${this.name}] Service recovered! Circuit transitioned to CLOSED.`);
    }
  }

  onFailure(err) {
    this.stats.failedCalls++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    console.warn(`⚠️ [CircuitBreaker:${this.name}] Failure ${this.failureCount}/${this.failureThreshold}: ${err.message}`);

    if (this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      console.error(`🚨 [CircuitBreaker:${this.name}] Tripped to OPEN! Fast-failing future calls for ${this.resetTimeout / 1000}s.`);
    }
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      stats: this.stats
    };
  }
}

// Global Breaker Registry
const breakers = new Map();

function getCircuitBreaker(name, options = {}) {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker(name, options));
  }
  return breakers.get(name);
}

function getAllCircuitStatuses() {
  const result = {};
  for (const [name, breaker] of breakers.entries()) {
    result[name] = breaker.getStatus();
  }
  return result;
}

module.exports = {
  CircuitBreaker,
  getCircuitBreaker,
  getAllCircuitStatuses
};
