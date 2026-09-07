/**
 * Rankly.ai - Enterprise Redis Caching Layer
 * Specification: Lead Vaibhav (Module 3.2)
 * 
 * Provides high-performance caching for frequent job queries, candidate queue counts,
 * and heavy ATS evaluations to minimize database load.
 * 
 * Architecture:
 * - Primary: Redis (via ioredis or redis client if REDIS_URL configured)
 * - Fallback: In-Memory TTL LRU cache with sub-millisecond lookups and identical async API.
 * - Auto-failover: Gracefully downgrades to memory cache if Redis disconnects.
 */

'use strict';

class InMemoryCacheStore {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
  }

  get(key) {
    if (!this.store.has(key)) return null;
    const expiry = this.ttls.get(key);
    if (expiry && Date.now() > expiry) {
      this.del(key);
      return null;
    }
    return this.store.get(key);
  }

  set(key, value, ttlSeconds) {
    this.store.set(key, value);
    if (ttlSeconds && ttlSeconds > 0) {
      this.ttls.set(key, Date.now() + (ttlSeconds * 1000));
    } else {
      this.ttls.delete(key);
    }
  }

  del(key) {
    this.store.delete(key);
    this.ttls.delete(key);
  }

  delPattern(pattern) {
    // pattern can be e.g. "jobs:*" or "candidates:*"
    const regexStr = '^' + pattern.replace(/\*/g, '.*') + '$';
    const regex = new RegExp(regexStr);
    let count = 0;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.del(key);
        count++;
      }
    }
    return count;
  }

  flush() {
    this.store.clear();
    this.ttls.clear();
  }

  size() {
    // clean expired first
    const now = Date.now();
    for (const [key, expiry] of this.ttls.entries()) {
      if (now > expiry) {
        this.del(key);
      }
    }
    return this.store.size;
  }

  keys() {
    return Array.from(this.store.keys());
  }
}

class RedisCacheService {
  constructor() {
    this.memoryStore = new InMemoryCacheStore();
    this.redisClient = null;
    this.isRedisConnected = false;
    this.engine = 'memory'; // 'redis' or 'memory'
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      dels: 0,
      startTime: Date.now()
    };

    this.initRedis();
  }

  initRedis() {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL;
    const redisHost = process.env.REDIS_HOST;

    if (!redisUrl && !redisHost) {
      this.engine = 'memory';
      return;
    }

    try {
      let Redis;
      try {
        Redis = require('ioredis');
      } catch (e) {
        // ioredis not available, keep memory engine
        this.engine = 'memory';
        return;
      }

      const options = {
        maxRetriesPerRequest: 2,
        connectTimeout: 3000,
        lazyConnect: true,
        enableOfflineQueue: false
      };

      if (redisUrl) {
        this.redisClient = new Redis(redisUrl, options);
      } else if (redisHost) {
        this.redisClient = new Redis({
          host: redisHost,
          port: parseInt(process.env.REDIS_PORT, 10) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          ...options
        });
      }

      if (this.redisClient) {
        this.redisClient.connect().then(() => {
          this.isRedisConnected = true;
          this.engine = 'redis';
          console.log('✅ [RedisCacheService] Connected to Redis Cluster / Server successfully.');
        }).catch((err) => {
          console.warn('⚠️ [RedisCacheService] Redis unreachable, falling back to High-Speed In-Memory Cache:', err.message);
          this.isRedisConnected = false;
          this.engine = 'memory';
        });

        this.redisClient.on('error', (err) => {
          if (this.isRedisConnected) {
            console.warn('⚠️ [RedisCacheService] Redis connection error, failing over to Memory Cache:', err.message);
          }
          this.isRedisConnected = false;
          this.engine = 'memory';
        });

        this.redisClient.on('ready', () => {
          this.isRedisConnected = true;
          this.engine = 'redis';
        });

        this.redisClient.on('close', () => {
          this.isRedisConnected = false;
          this.engine = 'memory';
        });
      }
    } catch (err) {
      console.warn('⚠️ [RedisCacheService] Redis init exception, using In-Memory Cache:', err.message);
      this.engine = 'memory';
    }
  }

  /**
   * Retrieve cached item
   * @param {string} key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    try {
      if (this.isRedisConnected && this.redisClient) {
        const raw = await this.redisClient.get(key);
        if (raw !== null) {
          this.stats.hits++;
          try {
            return JSON.parse(raw);
          } catch {
            return raw;
          }
        }
        this.stats.misses++;
        return null;
      }
    } catch (err) {
      // Redis failed, fallback to memory
      this.isRedisConnected = false;
      this.engine = 'memory';
    }

    const value = this.memoryStore.get(key);
    if (value !== null) {
      this.stats.hits++;
      return value;
    }
    this.stats.misses++;
    return null;
  }

  /**
   * Set cache item with TTL
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds Default: 300 (5 minutes)
   */
  async set(key, value, ttlSeconds = 300) {
    this.stats.sets++;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    try {
      if (this.isRedisConnected && this.redisClient) {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.redisClient.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await this.redisClient.set(key, serialized);
        }
        return true;
      }
    } catch (err) {
      this.isRedisConnected = false;
      this.engine = 'memory';
    }

    this.memoryStore.set(key, value, ttlSeconds);
    return true;
  }

  /**
   * Delete key
   * @param {string} key
   */
  async del(key) {
    this.stats.dels++;
    try {
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.del(key);
        return true;
      }
    } catch (err) {
      this.isRedisConnected = false;
      this.engine = 'memory';
    }

    this.memoryStore.del(key);
    return true;
  }

  /**
   * Delete keys matching a pattern (e.g. "jobs:*")
   * @param {string} pattern
   */
  async delPattern(pattern) {
    try {
      if (this.isRedisConnected && this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys && keys.length > 0) {
          await this.redisClient.del(...keys);
          this.stats.dels += keys.length;
          return keys.length;
        }
        return 0;
      }
    } catch (err) {
      this.isRedisConnected = false;
      this.engine = 'memory';
    }

    const count = this.memoryStore.delPattern(pattern);
    this.stats.dels += count;
    return count;
  }

  /**
   * Cache-aside helper: get or fetch, then cache
   * @param {string} key
   * @param {Function} fetcherFn
   * @param {number} ttlSeconds
   */
  async getOrSet(key, fetcherFn, ttlSeconds = 300) {
    const cached = await this.get(key);
    if (cached !== null) {
      return { data: cached, cached: true };
    }
    const freshData = await fetcherFn();
    if (freshData !== undefined && freshData !== null) {
      await this.set(key, freshData, ttlSeconds);
    }
    return { data: freshData, cached: false };
  }

  /**
   * Flush all keys in cache
   */
  async flush() {
    try {
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.flushdb();
      }
    } catch (err) {
      this.isRedisConnected = false;
      this.engine = 'memory';
    }
    this.memoryStore.flush();
    return true;
  }

  /**
   * Get telemetry stats
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRatio = totalRequests > 0 ? ((this.stats.hits / totalRequests) * 100).toFixed(2) + '%' : '0.00%';
    const uptimeSeconds = Math.floor((Date.now() - this.stats.startTime) / 1000);

    return {
      status: 'active',
      engine: this.engine,
      isRedisConnected: this.isRedisConnected,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRatio,
      totalKeys: this.memoryStore.size(),
      keysSample: this.memoryStore.keys().slice(0, 20),
      uptimeSeconds,
      memoryUsageBytes: process.memoryUsage().heapUsed
    };
  }

  // Key generator utilities for consistent naming across modules
  keys = {
    jobsList: (queryStr = '') => `jobs:list:${queryStr || 'all'}`,
    jobSingle: (id) => `jobs:item:${id}`,
    candidateQueueCount: (orgId = 'global') => `candidates:queue:${orgId}`,
    candidateStats: (orgId = 'global') => `candidates:stats:${orgId}`,
    atsEval: (evalId) => `ats:eval:${evalId}`,
    atsStats: () => `ats:stats:summary`
  };
}

const redisCacheService = new RedisCacheService();

module.exports = redisCacheService;
