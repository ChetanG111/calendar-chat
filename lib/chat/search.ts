/**
 * Event Search - App-side fuzzy matching
 * 
 * The app owns DB searches. AI only maps language to candidate criteria.
 * This module provides fuzzy search utilities for finding events.
 */

import { CalendarEvent } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface SearchCriteria {
    title?: string;
    startDate?: string;      // YYYY-MM-DD
    endDate?: string;        // YYYY-MM-DD
    startTime?: string;      // HH:MM
    type?: string;           // Calendar category
    location?: string;
}

export interface SearchResult {
    event: CalendarEvent;
    score: number;           // 0-1 relevance score
}

// ============================================================================
// Fuzzy Matching Utilities
// ============================================================================

/**
 * Simple fuzzy string match (case-insensitive contains)
 */
function fuzzyMatch(needle: string, haystack: string): boolean {
    return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Calculate a similarity score between two strings (0-1)
 * Uses a simple character overlap algorithm
 */
function similarityScore(a: string, b: string): number {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();

    if (aLower === bLower) return 1;
    if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.8;

    // Simple character overlap
    const aChars = new Set(aLower);
    const bChars = new Set(bLower);
    let overlap = 0;
    aChars.forEach(char => {
        if (bChars.has(char)) overlap++;
    });

    return overlap / Math.max(aChars.size, bChars.size);
}

/**
 * Check if a date is on a specific day
 */
function isOnDate(eventDate: Date, targetDateStr: string): boolean {
    const eventDateStr = eventDate.toISOString().split('T')[0];
    return eventDateStr === targetDateStr;
}

/**
 * Check if a date is within a range
 */
function isInRange(eventStart: Date, eventEnd: Date, rangeStart: string, rangeEnd: string): boolean {
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    end.setHours(23, 59, 59, 999);

    return eventStart <= end && eventEnd >= start;
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search events by criteria
 * Returns events sorted by relevance score
 */
export function searchEvents(
    events: CalendarEvent[],
    criteria: SearchCriteria
): SearchResult[] {
    const results: SearchResult[] = [];

    for (const event of events) {
        let score = 0;
        let matchCount = 0;
        let criteriaCount = 0;

        // Title match (weighted heavily)
        if (criteria.title) {
            criteriaCount++;
            const titleScore = similarityScore(criteria.title, event.title);
            if (titleScore > 0.3) {
                score += titleScore * 0.5; // 50% weight
                matchCount++;
            }
        }

        // Date match
        if (criteria.startDate) {
            criteriaCount++;
            if (isOnDate(new Date(event.start), criteria.startDate)) {
                score += 0.3; // 30% weight
                matchCount++;
            }
        }

        // Date range match
        if (criteria.startDate && criteria.endDate) {
            criteriaCount++;
            if (isInRange(new Date(event.start), new Date(event.end), criteria.startDate, criteria.endDate)) {
                score += 0.2;
                matchCount++;
            }
        }

        // Type/category match
        if (criteria.type) {
            criteriaCount++;
            if (event.type.toLowerCase() === criteria.type.toLowerCase()) {
                score += 0.1;
                matchCount++;
            }
        }

        // Location match
        if (criteria.location && event.location) {
            criteriaCount++;
            if (fuzzyMatch(criteria.location, event.location)) {
                score += 0.1;
                matchCount++;
            }
        }

        // Only include if at least one criteria matched
        if (matchCount > 0) {
            // Normalize score based on how many criteria were provided
            const normalizedScore = criteriaCount > 0 ? score / (criteriaCount * 0.5) : score;
            results.push({
                event,
                score: Math.min(normalizedScore, 1),
            });
        }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results;
}

/**
 * Find events matching a title (fuzzy)
 */
export function findEventsByTitle(
    events: CalendarEvent[],
    title: string
): SearchResult[] {
    return searchEvents(events, { title });
}

/**
 * Find events on a specific date
 */
export function findEventsOnDate(
    events: CalendarEvent[],
    dateStr: string
): CalendarEvent[] {
    return events.filter(event => isOnDate(new Date(event.start), dateStr));
}

/**
 * Find events in a date range
 */
export function findEventsInRange(
    events: CalendarEvent[],
    startDate: string,
    endDate: string
): CalendarEvent[] {
    return events.filter(event =>
        isInRange(new Date(event.start), new Date(event.end), startDate, endDate)
    );
}

/**
 * Find the best matching event for given criteria
 * Returns null if no good match found (score < 0.5)
 */
export function findBestMatch(
    events: CalendarEvent[],
    criteria: SearchCriteria
): CalendarEvent | null {
    const results = searchEvents(events, criteria);

    if (results.length === 0 || results[0].score < 0.5) {
        return null;
    }

    return results[0].event;
}

/**
 * Find events that might be duplicates (for disambiguation)
 * Returns events if multiple good matches exist
 */
export function findAmbiguousMatches(
    events: CalendarEvent[],
    criteria: SearchCriteria,
    threshold: number = 0.5
): CalendarEvent[] {
    const results = searchEvents(events, criteria);

    // Filter to only good matches
    const goodMatches = results.filter(r => r.score >= threshold);

    // If only one good match, return empty (not ambiguous)
    if (goodMatches.length <= 1) {
        return [];
    }

    // Return all good matches for disambiguation
    return goodMatches.map(r => r.event);
}
