/**
 * Rate Limiter
 *
 * Enforces request budget rules:
 * - Max 3 LLM calls per user action
 * - Auto-retry limit: 2
 * - Burst allowance: 30 req/min
 * - Exponential backoff: 200ms → 400ms → 800ms
 */

// ============================================================================
// Configuration
// ============================================================================

export interface RateLimitConfig {
    /** Max LLM calls per user action */
    maxCallsPerAction: number;
    /** Max retries on failure */
    maxRetries: number;
    /** Max clarifying questions per action */
    maxClarifications: number;
    /** Burst limit per minute */
    burstLimitPerMinute: number;
    /** Initial backoff delay in ms */
    initialBackoffMs: number;
    /** Backoff multiplier */
    backoffMultiplier: number;
    /** Max backoff delay in ms */
    maxBackoffMs: number;
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
    maxCallsPerAction: 3,
    maxRetries: 2,
    maxClarifications: 1,
    burstLimitPerMinute: 30,
    initialBackoffMs: 200,
    backoffMultiplier: 2,
    maxBackoffMs: 800,
};

// ============================================================================
// Action Tracker
// ============================================================================

export interface ActionBudget {
    actionId: string;
    llmCallCount: number;
    retryCount: number;
    clarificationCount: number;
    startTime: number;
}

// Track actions in-flight (per request, no persistence needed)
const activeActions = new Map<string, ActionBudget>();

// Track requests per minute for burst limiting
const requestTimestamps: number[] = [];

// ============================================================================
// Rate Limiter Class
// ============================================================================

export class RateLimiter {
    private config: RateLimitConfig;

    constructor(config: Partial<RateLimitConfig> = {}) {
        this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
    }

    /**
     * Start tracking a new action
     */
    startAction(actionId: string): ActionBudget {
        const budget: ActionBudget = {
            actionId,
            llmCallCount: 0,
            retryCount: 0,
            clarificationCount: 0,
            startTime: Date.now(),
        };
        activeActions.set(actionId, budget);
        return budget;
    }

    /**
     * Get the current budget for an action
     */
    getActionBudget(actionId: string): ActionBudget | undefined {
        return activeActions.get(actionId);
    }

    /**
     * End tracking for an action
     */
    endAction(actionId: string): void {
        activeActions.delete(actionId);
    }

    /**
     * Check if we can make another LLM call for this action
     */
    canMakeLLMCall(actionId: string): boolean {
        const budget = activeActions.get(actionId);
        if (!budget) return false;
        return budget.llmCallCount < this.config.maxCallsPerAction;
    }

    /**
     * Record an LLM call
     */
    recordLLMCall(actionId: string): boolean {
        const budget = activeActions.get(actionId);
        if (!budget) return false;

        if (budget.llmCallCount >= this.config.maxCallsPerAction) {
            return false; // Budget exceeded
        }

        budget.llmCallCount++;
        requestTimestamps.push(Date.now());
        this.cleanOldTimestamps();
        return true;
    }

    /**
     * Check if we can retry
     */
    canRetry(actionId: string): boolean {
        const budget = activeActions.get(actionId);
        if (!budget) return false;
        return budget.retryCount < this.config.maxRetries &&
            budget.llmCallCount < this.config.maxCallsPerAction;
    }

    /**
     * Record a retry attempt
     */
    recordRetry(actionId: string): boolean {
        const budget = activeActions.get(actionId);
        if (!budget) return false;

        if (budget.retryCount >= this.config.maxRetries) {
            return false;
        }

        budget.retryCount++;
        return true;
    }

    /**
     * Check if we can ask for clarification
     */
    canAskClarification(actionId: string): boolean {
        const budget = activeActions.get(actionId);
        if (!budget) return false;
        return budget.clarificationCount < this.config.maxClarifications;
    }

    /**
     * Record a clarification question
     */
    recordClarification(actionId: string): boolean {
        const budget = activeActions.get(actionId);
        if (!budget) return false;

        if (budget.clarificationCount >= this.config.maxClarifications) {
            return false;
        }

        budget.clarificationCount++;
        return true;
    }

    /**
     * Check if burst limit is exceeded (global)
     */
    isBurstLimitExceeded(): boolean {
        this.cleanOldTimestamps();
        return requestTimestamps.length >= this.config.burstLimitPerMinute;
    }

    /**
     * Calculate backoff delay for retries
     */
    calculateBackoffMs(retryNumber: number): number {
        const delay = this.config.initialBackoffMs *
            Math.pow(this.config.backoffMultiplier, retryNumber);
        return Math.min(delay, this.config.maxBackoffMs);
    }

    /**
     * Sleep for backoff delay
     */
    async backoff(retryNumber: number): Promise<void> {
        const delay = this.calculateBackoffMs(retryNumber);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Get graceful degradation message when limits exceeded
     */
    getGracefulDegradationMessage(): string {
        return "I'm processing a lot of requests right now. Please try again in a moment.";
    }

    /**
     * Clean timestamps older than 1 minute
     */
    private cleanOldTimestamps(): void {
        const oneMinuteAgo = Date.now() - 60000;
        while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
            requestTimestamps.shift();
        }
    }

    /**
     * Get current rate stats (for instrumentation)
     */
    getRateStats(): { requestsInLastMinute: number; activeActions: number } {
        this.cleanOldTimestamps();
        return {
            requestsInLastMinute: requestTimestamps.length,
            activeActions: activeActions.size,
        };
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(config?: Partial<RateLimitConfig>): RateLimiter {
    if (!rateLimiterInstance) {
        rateLimiterInstance = new RateLimiter(config);
    }
    return rateLimiterInstance;
}

export function createRateLimiter(config?: Partial<RateLimitConfig>): RateLimiter {
    return new RateLimiter(config);
}
