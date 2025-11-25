import React, { useEffect, useRef, useCallback, useState } from "react";
import { useFilteredActivities } from "../../hooks/useFilteredActivities";
import { useProjectStore } from "../../store/useProjectStore";

/**
 * GanttChart (amCharts5) with dependency lines overlay.
 * - Theme A (dark): white labels & faint white gridlines
 * - Full tooltip from `raw` activity
 * - Loading spinner while chart initializes
 *
 * NOTE: Add amCharts CDN scripts to public/index.html:
 * <script src="https://cdn.amcharts.com/lib/5/index.js"></script>
 * <script src="https://cdn.amcharts.com/lib/5/xy.js"></script>
 * <script src="https://cdn.amcharts.com/lib/5/themes/Animated.js"></script>
 *
 * Provide CSS for classes used (loader, wrapper, overlay...) in your external stylesheet.
 */

const GanttChart: React.FC = () => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const chartDivRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<SVGSVGElement | null>(null);
  const amRootRef = useRef<any | null>(null);

  const activities = useFilteredActivities();
  const projectData = useProjectStore((s) => s.projectData);
  const relationships = projectData?.relationships ?? [];

  const [loading, setLoading] = useState<boolean>(true);

  // convert activity -> amCharts friendly data
  const chartData = activities.map((a, i) => {
    const startDate = a.early_start_date
      ? new Date(a.early_start_date.split(" ")[0] + "T00:00:00")
      : new Date();
    const endDate = a.early_end_date
      ? new Date(a.early_end_date.split(" ")[0] + "T00:00:00")
      : new Date(startDate.getTime() + 24 * 3600 * 1000);
    const isCritical = Number(a.total_float) <= 0;
    return {
      id: a.task_id,
      task: a.task_code || a.task_name || `Task ${i + 1}`,
      name: a.task_name || "",
      start: startDate.getTime(),
      end: endDate.getTime(),
      color: isCritical ? "#ef4444" : "#22c55e",
      critical: isCritical,
      raw: a,
    };
  });

  // helper: amCharts on window (CDN)
  const getAm5 = useCallback(() => (window as any).am5, []);
  const getAm5xy = useCallback(() => (window as any).am5xy, []);
  const getAm5themes = useCallback(() => (window as any).am5themes_Animated, []);

  useEffect(() => {
    const am5 = getAm5();
    const am5xy = getAm5xy();
    const am5themes = getAm5themes();

    if (!am5 || !am5xy) {
      console.error(
        "amCharts not found on window. Make sure you added CDN scripts to index.html."
      );
      return;
    }
    if (!chartDivRef.current) return;

    // show loader while building chart
    setLoading(true);

    // create root
    const root = am5.Root.new(chartDivRef.current);
    amRootRef.current = root;

    // dark theme + animated
    root.setThemes([am5themes.new(root)]);

    // create chart
    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: true,
        panY: true,
        wheelX: "zoomX",
        wheelY: "zoomX",
        layout: root.horizontalLayout,
        maxTooltipDistance: 10,
      })
    );

    // X axis (date)
    const xAxis = chart.xAxes.push(
      am5xy.DateAxis.new(root, {
        baseInterval: { timeUnit: "day", count: 1 },
        renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 60 }),
        tooltip: am5.Tooltip.new(root, {}),
      })
    );

    // Style X axis labels and grid (Theme A - white)
    xAxis.get("renderer").labels.template.setAll({
      fill: am5.color(0xffffff),
      fontSize: 11,
      opacity: 0.95,
    });
    xAxis.get("renderer").grid.template.setAll({
      stroke: am5.color(0xffffff),
      strokeOpacity: 0.12,
    });

    // Y axis (category)
    const yRenderer = am5xy.AxisRendererY.new(root, {
      cellStartLocation: 0.1,
      cellEndLocation: 0.9,
    });

    const yAxis = chart.yAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "task",
        renderer: yRenderer,
        tooltip: am5.Tooltip.new(root, {}),
      })
    );

    // Style Y axis labels and grid (Theme A - white)
    yAxis.get("renderer").labels.template.setAll({
      fill: am5.color(0xffffff),
      fontSize: 12,
      opacity: 0.95,
    });
    yAxis.get("renderer").grid.template.setAll({
      stroke: am5.color(0xffffff),
      strokeOpacity: 0.06,
    });

    // column series (gantt bars)
    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: "Tasks",
        xAxis: xAxis,
        yAxis: yAxis,
        openValueXField: "start",
        valueXField: "end",
        categoryYField: "task",
        sequencedInterpolation: false,
        tooltip: am5.Tooltip.new(root, {}),
      })
    );

    series.columns.template.setAll({
      height: 18,
      cornerRadiusBR: 6,
      cornerRadiusTR: 6,
      cornerRadiusBL: 6,
      cornerRadiusTL: 6,
      strokeOpacity: 0.9,
      strokeWidth: 1,
    });

    // color adapter
    // @ts-ignore - using amCharts adapters
    series.columns.template.adapters.add("fill", (fill: any, target: any) => {
      const dataItem = target.dataItem;
      return dataItem ? dataItem.get("dataContext")?.color ?? fill : fill;
    });
    // @ts-ignore
    series.columns.template.adapters.add("stroke", (stroke: any, target: any) => {
      const dataItem = target.dataItem;
      return dataItem ? dataItem.get("dataContext")?.color ?? stroke : stroke;
    });

    // small left label bullet (name)
    // @ts-ignore
    series.bullets.push(function (root2: any, series2: any, dataItem: any) {
      return am5.Bullet.new(root2, {
        sprite: am5.Label.new(root2, {
          text: "{name}",
          populateText: true,
          centerY: am5.percent(50),
          x: 8,
          fontSize: 12,
          fill: am5.color(0xffffff),
          truncate: true,
          maxWidth: 200,
        }),
      });
    });

    // Add cursor for tooltip interaction (required for tooltips to work)
    const cursor = chart.set("cursor", am5xy.XYCursor.new(root, {
      behavior: "none",
      xAxis: xAxis,
    }));
    cursor.lineX.setAll({
      stroke: am5.color(0xffffff),
      strokeOpacity: 0.2,
      strokeDasharray: [5, 5],
    });

    // Configure tooltip with proper date formatting
    const tooltip = series.get("tooltip")!;
    tooltip.setAll({
      getFillFromSprite: false,
      autoTextColor: false,
    });

    // Use label adapter to format tooltip text with dates
    tooltip.label.adapters.add("text", (text: string, target: any) => {
      const dataItem = target.dataItem;
      if (!dataItem) return text;
      
      const dataContext = dataItem.dataContext as any;
      if (!dataContext) return text;

      // Get formatted dates from the axis
      const startDate = new Date(dataContext.start);
      const endDate = new Date(dataContext.end);
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Build tooltip text
      const name = dataContext.name || "";
      const task = dataContext.task || "";
      const float = dataContext.raw?.total_float ?? "N/A";
      const critical = dataContext.critical ? "Yes" : "No";
    //   const duration = dataContext.raw?.duration ?? "N/A";
    //   const calendar = dataContext.raw?.calendar_id ?? "N/A";

      return `[bold]${name}[/]\n` +
        `ID: ${task}\n` +
        `Start: ${formatDate(startDate)}\n` +
        `End: ${formatDate(endDate)}\n` +
        `Float: ${float}\n` +
        `Critical: ${critical}\n` 
        // `Duration: ${duration}\n` +
        // `Calendar: ${calendar}`;
    });

    // Style tooltip
    tooltip.get("background")!.setAll({
      fill: am5.color(0x1e293b),
      fillOpacity: 0.95,
      stroke: am5.color(0x10b981),
      strokeWidth: 1,
      cornerRadiusTL: 8,
      cornerRadiusTR: 8,
      cornerRadiusBL: 8,
      cornerRadiusBR: 8,
    });
    tooltip.label.setAll({
      fill: am5.color(0xffffff),
      fontSize: 12,
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 10,
      paddingRight: 10,
    });

    // set data
    yAxis.data.setAll(chartData as any);
    series.data.setAll(chartData as any);

    // Fade in chart
    chart.appear(800, 100);

    // Create overlay SVG for dependency lines
    const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    overlay.setAttribute("class", "gantt-overlay");
    overlay.setAttribute(
      "style",
      "position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; overflow:visible;"
    );
    overlayRef.current = overlay;

    if (wrapperRef.current) {
      wrapperRef.current.style.position = wrapperRef.current.style.position || "relative";
      wrapperRef.current.appendChild(overlay);
    }

    // helper to find column rect by task ID (search by data-task-id)
    function getColumnRectByTaskId(taskId: string) {
      const div = chartDivRef.current;
      if (!div) return null;
      // first try direct query
      const direct = div.querySelector<SVGRectElement>(`rect[data-task-id="${taskId}"]`);
      if (direct) return direct.getBoundingClientRect();

      // fallback: choose visible rects (exclude tiny gridlines) and attempt best-effort match by vertical proximity
      const allRects = Array.from(div.querySelectorAll<SVGRectElement>("rect")).filter((r) => {
        const rbox = r.getBoundingClientRect();
        return rbox.width > 3 && rbox.height > 6;
      });

      // Heuristic fallback: try to match by vertical order using y coordinate and task index from chartData
      const targetIndex = chartData.findIndex((d) => d.id === taskId);
      if (targetIndex >= 0 && allRects[targetIndex]) {
        return allRects[targetIndex].getBoundingClientRect();
      }

      // last-resort: return first rect
      return allRects[0]?.getBoundingClientRect() ?? null;
    }

    // draw dependency lines
    function drawDependencyLines() {
      if (!overlayRef.current) return;
      // clear
      while (overlayRef.current.firstChild) overlayRef.current.removeChild(overlayRef.current.firstChild);

      const overlayRect = overlayRef.current.getBoundingClientRect();
      // add defs with arrow marker if not present
      if (!overlayRef.current.querySelector("#gantt-arrow")) {
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute("id", "gantt-arrow");
        marker.setAttribute("viewBox", "0 0 10 10");
        marker.setAttribute("refX", "10");
        marker.setAttribute("refY", "5");
        marker.setAttribute("markerWidth", "6");
        marker.setAttribute("markerHeight", "6");
        marker.setAttribute("orient", "auto");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
        path.setAttribute("fill", "rgba(255,255,255,0.85)");
        marker.appendChild(path);
        defs.appendChild(marker);
        overlayRef.current.appendChild(defs);
      }

      relationships.forEach((rel) => {
        const predRect = getColumnRectByTaskId(rel.pred_task_id);
        const succRect = getColumnRectByTaskId(rel.task_id);
        if (!predRect || !succRect) return;

        const startX = predRect.right - overlayRect.left;
        const startY = predRect.top + predRect.height / 2 - overlayRect.top;
        const endX = succRect.left - overlayRect.left;
        const endY = succRect.top + succRect.height / 2 - overlayRect.top;

        const offset = 12;
        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const d = `M ${startX} ${startY} L ${startX + offset} ${startY} L ${startX + offset} ${endY} L ${endX - 6} ${endY}`;
        pathEl.setAttribute("d", d);
        pathEl.setAttribute("fill", "none");
        pathEl.setAttribute("stroke", "rgba(255,255,255,0.7)");
        pathEl.setAttribute("stroke-width", "1.6");
        pathEl.setAttribute("stroke-linecap", "round");
        pathEl.setAttribute("marker-end", "url(#gantt-arrow)");
        overlayRef.current!.appendChild(pathEl);
      });
    }

    // attempt to assign data-task-id attributes to rects for more reliable mapping
    const assignRectIds = () => {
      const div = chartDivRef.current;
      if (!div) return;
      const rects = Array.from(div.querySelectorAll<SVGRectElement>("rect")).filter((r) => {
        const rbox = r.getBoundingClientRect();
        return rbox.width > 3 && rbox.height > 6;
      });

      // naive assignment: match in order
      chartData.forEach((d, idx) => {
        const r = rects[idx];
        if (r && !r.getAttribute("data-task-id")) {
          r.setAttribute("data-task-id", String(d.id));
        }
      });
    };

    // redraw & assign with slight delay to let amcharts place DOM
    const redrawWithDelay = () => {
      setTimeout(() => {
        try {
          assignRectIds();
        } catch (e) {
          // ignore
        }
        drawDependencyLines();
        // hide loader after initial draw
        setLoading(false);
      }, 220);
    };

    // initial call
    redrawWithDelay();

    // update overlay on chart interactions / resize
    const onRangeChange = () => {
      drawDependencyLines();
    };
    xAxis.events.on("rangechanged", onRangeChange);
    yAxis.events.on("rangechanged", onRangeChange);
    chart.events.on("boundschanged", onRangeChange);
    series.events.on("datavalidated", redrawWithDelay);

    const ro = new ResizeObserver(() => {
      drawDependencyLines();
    });
    if (wrapperRef.current) ro.observe(wrapperRef.current);

    // cleanup on unmount
    return () => {
      try {
        xAxis.events.off("rangechanged", onRangeChange);
        yAxis.events.off("rangechanged", onRangeChange);
        chart.events.off("boundschanged", onRangeChange);
        series.events.off("datavalidated", redrawWithDelay);
        ro.disconnect();
      } catch (e) {
        /* ignore */
      }

      if (overlayRef.current && overlayRef.current.parentElement) {
        overlayRef.current.parentElement.removeChild(overlayRef.current);
      }
      overlayRef.current = null;

      try {
        root.dispose();
      } catch (e) {
        /* ignore */
      }
      amRootRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAm5, getAm5xy, getAm5themes, JSON.stringify(chartData), JSON.stringify(relationships)]);

  return (
    <div className="gantt-wrapper" ref={wrapperRef}>
      <div className="gantt-header">
        <div>
          <h3 className="gantt-title">Gantt Chart</h3>
          <p className="gantt-subtitle">Scroll horizontally to view timeline</p>
        </div>
        {/* <div className="gantt-legend">
          <div className="legend-item">
            <div className="legend-color success" />
            <span className="legend-label">On Track</span>
          </div>
          <div className="legend-item">
            <div className="legend-color critical" />
            <span className="legend-label">Critical</span>
          </div>
        </div> */}
      </div>

      <div className="gantt-chart-area" style={{ height: "420px", position: "relative" }}>
        {loading && (
          <div className="gantt-loading" role="status" aria-live="polite">
            <div className="gantt-spinner" />
          </div>
        )}

        <div ref={chartDivRef} style={{ width: "100%", height: "100%" }} />
        {/* overlay appended dynamically into wrapperRef */}
      </div>
    </div>
  );
};

export default GanttChart;
