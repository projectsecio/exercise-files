import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";

export type CountryItem = {
  country_name?: string;
  country_code?: string;
  count?: number;
};

type Props = {
  items: CountryItem[];
};

// ECharts no longer ships world.json at many CDN paths (404). Use a stable GeoJSON.
const WORLD_GEOJSON =
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

function regionLabel(iso2: string): string {
  const code = iso2.trim().toUpperCase();
  if (!code) return "";
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}

export default function CountriesMapChart({ items }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    let disposed = false;
    let chart: echarts.ECharts | null = null;
    let ro: ResizeObserver | null = null;
    setLoadError(null);

    (async () => {
      try {
        const res = await fetch(WORLD_GEOJSON);
        if (!res.ok) throw new Error(`GeoJSON HTTP ${res.status}`);
        const worldJson = await res.json();
        if (disposed || !el) return;

        echarts.registerMap("world", worldJson as never);
        chart = echarts.init(el, undefined, { renderer: "canvas" });

        const data = items.map((row) => {
          const code = String(row.country_code ?? "").trim().toUpperCase();
          const name =
            String(row.country_name ?? "").trim() || regionLabel(code) || code;
          return {
            name,
            value: Number(row.count) || 0,
          };
        });
        const max = Math.max(1, ...data.map((d) => d.value));

        chart.setOption({
          tooltip: {
            trigger: "item",
            backgroundColor: "#18181b",
            borderColor: "#3f3f46",
            textStyle: { color: "#f4f4f5" },
            formatter: (p: unknown) => {
              const params = p as { name?: string; value?: number };
              const v = params.value ?? 0;
              return `${params.name ?? ""}<br/><span style="color:#7dd3fc">IPs in feed: ${v}</span>`;
            },
          },
          visualMap: {
            min: 0,
            max,
            left: 16,
            bottom: 16,
            text: ["High", "Low"],
            textStyle: { color: "#a1a1aa", fontSize: 11 },
            inRange: {
              color: ["#18181b", "#0c4a6e", "#0369a1", "#0ea5e9", "#7dd3fc"],
            },
            calculable: true,
          },
          series: [
            {
              name: "Top countries (by IP hits)",
              type: "map",
              map: "world",
              roam: true,
              scaleLimit: { min: 0.6, max: 6 },
              emphasis: {
                label: { show: true, color: "#fafafa", fontSize: 10 },
                itemStyle: { areaColor: "#38bdf8", borderColor: "#e4e4e7" },
              },
              itemStyle: {
                areaColor: "#27272a",
                borderColor: "#3f3f46",
              },
              data,
            },
          ],
        });

        ro = new ResizeObserver(() => chart?.resize());
        ro.observe(el);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("CountriesMapChart:", e);
        if (!disposed) setLoadError(msg);
      }
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      chart?.dispose();
    };
  }, [items]);

  return (
    <div className="space-y-2">
      {loadError && (
        <p className="rounded border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          Map could not load ({loadError}). Check browser devtools Network tab and any
          content-blocker for <span className="break-all">{WORLD_GEOJSON}</span>
        </p>
      )}
      <div ref={hostRef} className="h-80 w-full min-h-[20rem]" />
      <p className="text-[11px] leading-relaxed text-zinc-500">
        Shading matches feed country names to the map. Pan and zoom.
      </p>
    </div>
  );
}
