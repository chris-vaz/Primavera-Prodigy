import React, { useRef, useEffect, useState, useMemo } from 'react';
import { select, scaleTime, extent, timeDay, timeFormat } from 'd3';
import { useProjectStore } from '../../store/useProjectStore';
import { useFilteredActivities } from '../../hooks/useFilteredActivities';
import type { P6Activity } from '../../lib/xer-parser/types';

// Constants
const ROW_HEIGHT = 30;
const MARGIN = { top: 20, right: 30, bottom: 20, left: 10 };
const DATE_FORMAT = timeFormat('%b %d');
const MIN_BAR_WIDTH = 2;
const ARROW_MARKER_ID = 'gantt-arrowhead';

// Helpers
const parseP6Date = (dateString?: string): Date => {
    if (!dateString) return new Date();
    return new Date(dateString.split(' ')[0] + 'T00:00:00');
};

const getProjectDateExtent = (activities: P6Activity[]): [Date, Date] => {
    const dates: Date[] = [];
    activities.forEach(a => {
        if (a.early_start_date) dates.push(parseP6Date(a.early_start_date));
        if (a.early_end_date) dates.push(parseP6Date(a.early_end_date));
    });

    const [minDate, maxDate] = extent(dates) as [Date, Date];

    if (!minDate || !maxDate) {
        const today = new Date();
        return [timeDay.offset(today, -15), timeDay.offset(today, 15)];
    }

    const extendedMin = timeDay.offset(minDate, -15);
    const extendedMax = timeDay.offset(maxDate, 15);
    return [extendedMin, extendedMax];
};

const GanttChart: React.FC = () => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const activities = useFilteredActivities();
    const projectData = useProjectStore(state => state.projectData);
    const relationships = projectData?.relationships ?? [];

    const [chartWidth, setChartWidth] = useState<number>(0);

    const activitiesCount = activities.length;
    const height = activitiesCount * ROW_HEIGHT + MARGIN.top + MARGIN.bottom;
    const chartHeight = Math.max(activitiesCount * ROW_HEIGHT, ROW_HEIGHT);

    const [minDate, maxDate] = useMemo(() => getProjectDateExtent(activities), [activities]);

    useEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;
        let timeout: number | null = null;

        const ro = new ResizeObserver(() => {
            if (timeout) window.clearTimeout(timeout);
            timeout = window.setTimeout(() => {
                const rect = el.getBoundingClientRect();
                const inner = Math.max(100, rect.width - MARGIN.left - MARGIN.right - 20);
                setChartWidth(inner);
            }, 120);
        });

        ro.observe(el);

        const rect = el.getBoundingClientRect();
        setChartWidth(Math.max(100, rect.width - MARGIN.left - MARGIN.right - 20));

        return () => {
            ro.disconnect();
            if (timeout) window.clearTimeout(timeout);
        };
    }, []);

    const xScale = useMemo(() => {
        if (!minDate || !maxDate || chartWidth <= 0) return null;
        return scaleTime().domain([minDate, maxDate]).range([0, chartWidth]);
    }, [minDate, maxDate, chartWidth]);

    useEffect(() => {
        if (!xScale || chartWidth <= 0 || activitiesCount === 0) {
            const svg = select(svgRef.current);
            svg.selectAll('*').remove();
            return;
        }

        const svg = select(svgRef.current);
        svg.selectAll('*').remove();

        svg.attr('width', chartWidth + MARGIN.left + MARGIN.right).attr('height', height);

        const defs = svg.append('defs');
        defs
            .append('marker')
            .attr('id', ARROW_MARKER_ID)
            .attr('viewBox', '0 0 10 10')
            .attr('refX', 5)
            .attr('refY', 5)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto-start-reverse')
            .append('path')
            .attr('d', 'M 0 0 L 10 5 L 0 10 z')
            .attr('fill', 'rgba(34, 197, 94, 0.6)');

        const g = svg.append('g').attr('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

        const activityRenderMap = new Map<string, { index: number; startX: number; endX: number }>();

        activities.forEach((activity, index) => {
            const start = parseP6Date(activity.early_start_date);
            const end = parseP6Date(activity.early_end_date);
            const isCritical = Number(activity.total_float) <= 0;

            const x = xScale(start);
            const w = Math.max(MIN_BAR_WIDTH, xScale(end) - x);
            const y = index * ROW_HEIGHT;

            g.append('rect')
                .attr('x', 0)
                .attr('y', y)
                .attr('width', chartWidth)
                .attr('height', ROW_HEIGHT)
                .attr('fill', index % 2 === 0 ? 'rgba(15, 23, 42, 0.3)' : 'rgba(30, 41, 59, 0.3)')
                .attr('opacity', 0.4);

            g.append('rect')
                .attr('x', x)
                .attr('y', y + 6)
                .attr('width', w)
                .attr('height', ROW_HEIGHT - 12)
                .attr('rx', 6)
                .attr('ry', 6)
                .attr('fill', isCritical ? '#ef4444' : '#22c55e')
                .attr('opacity', isCritical ? 0.9 : 0.8)
                .attr('stroke', isCritical ? '#dc2626' : '#16a34a')
                .attr('stroke-width', 1)
                .attr('data-task-id', activity.task_id)
                .attr('class', 'gantt-bar')
                .style('cursor', 'pointer')
                .on('mouseover', function() {
                    select(this).attr('opacity', 1).attr('stroke-width', 2);
                })
                .on('mouseout', function() {
                    select(this).attr('opacity', isCritical ? 0.9 : 0.8).attr('stroke-width', 1);
                });

            activityRenderMap.set(activity.task_id, {
                index,
                startX: x,
                endX: x + w,
            });
        });

        g.append('line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', 0)
            .attr('y2', 0)
            .attr('stroke', 'rgba(34, 197, 94, 0.3)')
            .attr('stroke-width', 2);

        const weekly = timeDay.every(7) ?? timeDay;
        const tickDays = xScale.ticks(weekly);
        const ticks = g.selectAll('.x-tick').data(tickDays).enter();
        
        ticks
            .append('line')
            .attr('class', 'x-tick-line')
            .attr('x1', d => xScale(d))
            .attr('x2', d => xScale(d))
            .attr('y1', 0)
            .attr('y2', chartHeight)
            .attr('stroke', 'rgba(34, 197, 94, 0.1)')
            .attr('stroke-width', 1)
            .lower();

        ticks
            .append('text')
            .attr('class', 'x-tick')
            .attr('x', d => xScale(d))
            .attr('y', -8)
            .attr('fill', '#94a3b8')
            .attr('font-size', 11)
            .attr('font-weight', '600')
            .attr('text-anchor', 'middle')
            .text(d => DATE_FORMAT(d));

        if (relationships.length > 0) {
            const linesG = g.append('g').attr('class', 'dependency-lines');
            relationships.forEach(rel => {
                const pred = activityRenderMap.get(rel.pred_task_id);
                const succ = activityRenderMap.get(rel.task_id);
                if (!pred || !succ) return;

                const predY = pred.index * ROW_HEIGHT + ROW_HEIGHT / 2;
                const succY = succ.index * ROW_HEIGHT + ROW_HEIGHT / 2;
                const predX = pred.endX;
                const succX = succ.startX;
                const offset = 10;

                const d = `M ${predX} ${predY} L ${predX + offset} ${predY} L ${predX + offset} ${succY} L ${succX} ${succY}`;
                linesG
                    .append('path')
                    .attr('d', d)
                    .attr('fill', 'none')
                    .attr('stroke', 'rgba(34, 197, 94, 0.4)')
                    .attr('stroke-width', 1.5)
                    .attr('stroke-dasharray', '4,2')
                    .attr('opacity', 0.6)
                    .attr('marker-end', `url(#${ARROW_MARKER_ID})`);
            });
        }
    }, [activities, relationships, xScale, chartWidth, height, activitiesCount]);

    return (
        <div ref={containerRef} className="gantt-container">
            <div className="gantt-header">
                <div>
                    <h3 className="gantt-title">Gantt Chart</h3>
                    <p className="gantt-subtitle">Scroll horizontally to view timeline</p>
                </div>
                {activitiesCount > 0 && (
                    <div className="gantt-legend">
                        <div className="legend-item">
                            <div className="legend-color success"></div>
                            <span className="legend-label">On Track</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color critical"></div>
                            <span className="legend-label">Critical</span>
                        </div>
                    </div>
                )}
            </div>
            {activitiesCount > 0 ? (
                <div className="gantt-chart-wrapper">
                    <svg ref={svgRef} style={{ display: 'block', minWidth: '100%' }} />
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <p className="empty-title">No activities to display</p>
                    <p className="empty-description">Select a WBS node with activities to view the schedule</p>
                </div>
            )}
        </div>
    );
};

export default GanttChart;