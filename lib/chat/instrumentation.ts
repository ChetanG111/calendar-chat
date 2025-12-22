/**
 * Chat Instrumentation
 *
 * Logs LLM calls, retries, clarifications, and failures.
 * Makes it easy to prove: "We never approach 30 req/min under normal usage."
 */

// ============================================================================
// Types
// ============================================================================

export interface RequestMetrics {
    timestamp: number;
    actionId: string;
    type: 'llm_call' | 'retry' | 'clarification' | 'failure' | 'success';
    durationMs?: number;
    metadata?: Record<string, unknown>;
}

export interface ActionMetrics {
    actionId: string;
    startTime: number;
    endTime?: number;
    llmCalls: number;
    retries: number;
    clarifications: number;
    success: boolean;
    intent?: string;
    error?: string;
}

export interface InstrumentationSummary {
    totalActions: number;
    totalLLMCalls: number;
    totalRetries: number;
    totalClarifications: number;
    totalFailures: number;
    avgLLMCallsPerAction: number;
    avgDurationMs: number;
    requestsInLastMinute: number;
    requestsInLastHour: number;
}

// ============================================================================
// Instrumentation Class
// ============================================================================

class ChatInstrumentation {
    private requestLog: RequestMetrics[] = [];
    private actionLog: Map<string, ActionMetrics> = new Map();
    private maxLogSize = 1000; // Keep last 1000 entries

    /**
     * Start instrumenting an action
     */
    startAction(actionId: string): void {
        this.actionLog.set(actionId, {
            actionId,
            startTime: Date.now(),
            llmCalls: 0,
            retries: 0,
            clarifications: 0,
            success: false,
        });
    }

    /**
     * Record an LLM call
     */
    recordLLMCall(actionId: string, durationMs?: number): void {
        const action = this.actionLog.get(actionId);
        if (action) {
            action.llmCalls++;
        }

        this.addRequest({
            timestamp: Date.now(),
            actionId,
            type: 'llm_call',
            durationMs,
        });

        this.logMetric('LLM_CALL', actionId, { durationMs });
    }

    /**
     * Record a retry
     */
    recordRetry(actionId: string, reason: string): void {
        const action = this.actionLog.get(actionId);
        if (action) {
            action.retries++;
        }

        this.addRequest({
            timestamp: Date.now(),
            actionId,
            type: 'retry',
            metadata: { reason },
        });

        this.logMetric('RETRY', actionId, { reason });
    }

    /**
     * Record a clarification question asked
     */
    recordClarification(actionId: string, field: string): void {
        const action = this.actionLog.get(actionId);
        if (action) {
            action.clarifications++;
        }

        this.addRequest({
            timestamp: Date.now(),
            actionId,
            type: 'clarification',
            metadata: { field },
        });

        this.logMetric('CLARIFICATION', actionId, { field });
    }

    /**
     * Record a failure
     */
    recordFailure(actionId: string, error: string): void {
        const action = this.actionLog.get(actionId);
        if (action) {
            action.success = false;
            action.error = error;
            action.endTime = Date.now();
        }

        this.addRequest({
            timestamp: Date.now(),
            actionId,
            type: 'failure',
            metadata: { error },
        });

        this.logMetric('FAILURE', actionId, { error });
    }

    /**
     * Record a success
     */
    recordSuccess(actionId: string, intent: string): void {
        const action = this.actionLog.get(actionId);
        if (action) {
            action.success = true;
            action.intent = intent;
            action.endTime = Date.now();
        }

        this.addRequest({
            timestamp: Date.now(),
            actionId,
            type: 'success',
            metadata: { intent },
        });

        this.logMetric('SUCCESS', actionId, { intent });
    }

    /**
     * Get summary of all instrumentation data
     */
    getSummary(): InstrumentationSummary {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const oneHourAgo = now - 3600000;

        const actions = Array.from(this.actionLog.values());
        const completedActions = actions.filter(a => a.endTime);

        const totalLLMCalls = actions.reduce((sum, a) => sum + a.llmCalls, 0);
        const totalRetries = actions.reduce((sum, a) => sum + a.retries, 0);
        const totalClarifications = actions.reduce((sum, a) => sum + a.clarifications, 0);
        const totalFailures = actions.filter(a => !a.success && a.endTime).length;

        const durations = completedActions
            .filter(a => a.endTime)
            .map(a => a.endTime! - a.startTime);
        const avgDuration = durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0;

        const requestsLastMinute = this.requestLog.filter(
            r => r.timestamp > oneMinuteAgo && r.type === 'llm_call'
        ).length;

        const requestsLastHour = this.requestLog.filter(
            r => r.timestamp > oneHourAgo && r.type === 'llm_call'
        ).length;

        return {
            totalActions: actions.length,
            totalLLMCalls,
            totalRetries,
            totalClarifications,
            totalFailures,
            avgLLMCallsPerAction: actions.length > 0 ? totalLLMCalls / actions.length : 0,
            avgDurationMs: avgDuration,
            requestsInLastMinute: requestsLastMinute,
            requestsInLastHour: requestsLastHour,
        };
    }

    /**
     * Get action metrics
     */
    getActionMetrics(actionId: string): ActionMetrics | undefined {
        return this.actionLog.get(actionId);
    }

    /**
     * Check if we're approaching rate limits
     */
    isApproachingLimit(): boolean {
        const summary = this.getSummary();
        return summary.requestsInLastMinute >= 25; // Warning at 25/30
    }

    /**
     * Add request to log with size management
     */
    private addRequest(request: RequestMetrics): void {
        this.requestLog.push(request);
        if (this.requestLog.length > this.maxLogSize) {
            this.requestLog.shift();
        }
    }

    /**
     * Log metric to console
     */
    private logMetric(type: string, actionId: string, data?: Record<string, unknown>): void {
        const summary = this.getSummary();
        console.log(`[CHAT_METRICS] ${type}`, {
            actionId: actionId.substring(0, 8),
            ...data,
            reqsLastMin: summary.requestsInLastMinute,
        });
    }

    /**
     * Clear all data (for testing)
     */
    clear(): void {
        this.requestLog = [];
        this.actionLog.clear();
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instrumentationInstance: ChatInstrumentation | null = null;

export function getInstrumentation(): ChatInstrumentation {
    if (!instrumentationInstance) {
        instrumentationInstance = new ChatInstrumentation();
    }
    return instrumentationInstance;
}

export function createInstrumentation(): ChatInstrumentation {
    return new ChatInstrumentation();
}

export { ChatInstrumentation };
