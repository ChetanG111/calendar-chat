import { CalendarEvent } from '@/types';
import React from 'react';

export const eventsOverlap = (a: CalendarEvent, b: CalendarEvent) => {
    return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
};

export const arrangeEvents = (events: CalendarEvent[]) => {
    const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
    const clusters: CalendarEvent[][] = [];

    for (const event of sorted) {
        let mergedCluster: CalendarEvent[] = [event];
        const newClusters: CalendarEvent[][] = [];

        // Find all overlapping clusters
        for (const cluster of clusters) {
            // Check overlap with any event in cluster
            if (cluster.some(e => eventsOverlap(e, event))) {
                mergedCluster = mergedCluster.concat(cluster);
            } else {
                newClusters.push(cluster);
            }
        }
        newClusters.push(mergedCluster);
        clusters.splice(0, clusters.length, ...newClusters);
    }

    const result: { event: CalendarEvent; style: React.CSSProperties }[] = [];

    for (const cluster of clusters) {
        const columns: CalendarEvent[][] = [];
        for (const event of cluster) {
            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                const last = columns[i][columns[i].length - 1];
                if (!eventsOverlap(last, event)) {
                    columns[i].push(event);
                    placed = true;
                    break;
                }
            }
            if (!placed) columns.push([event]);
        }

        const width = 100 / columns.length;
        columns.forEach((col, colIndex) => {
            col.forEach(event => {
                result.push({
                    event,
                    style: {
                        left: `${colIndex * width}%`,
                        width: `${width}%`
                    }
                });
            });
        });
    }
    return result;
};
