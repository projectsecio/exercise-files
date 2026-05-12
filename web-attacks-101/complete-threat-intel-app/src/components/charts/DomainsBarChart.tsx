import { useEffect, useRef } from "react";
import * as echarts from "echarts";

export type DomainItem = {
  domain?: string;
  count?: number;
  title?: string;
};

type Props = {
  items: DomainItem[];
};

export default function DomainsBarChart({ items }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const chart = echarts.init(el, undefined, { renderer: "canvas" });

    const labels = items.map((i) =>
      String(i.domain ?? i.title ?? "").trim() || "—"
    );
    const values = items.map((i) => Number(i.count) || 0);
    const max = Math.max(1, ...values);

    chart.setOption({
      grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
      xAxis: {
        type: "value",
        max,
        axisLabel: { color: "#a1a1aa", fontSize: 10 },
        splitLine: { lineStyle: { color: "#3f3f46", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: labels,
        inverse: true,
        axisLabel: {
          color: "#d4d4d8",
          fontSize: 11,
          width: 140,
          overflow: "truncate",
        },
        axisLine: { lineStyle: { color: "#52525b" } },
        axisTick: { show: false },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "#18181b",
        borderColor: "#3f3f46",
        textStyle: { color: "#f4f4f5" },
      },
      series: [
        {
          type: "bar",
          data: values,
          barMaxWidth: 22,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: "#0369a1" },
              { offset: 1, color: "#38bdf8" },
            ]),
            borderRadius: [0, 4, 4, 0],
          },
          label: {
            show: true,
            position: "right",
            color: "#7dd3fc",
            fontSize: 11,
          },
        },
      ],
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [items]);

  return <div ref={hostRef} className="h-72 w-full min-h-[18rem]" />;
}
