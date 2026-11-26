import type { HighchartsOptionsType } from "@highcharts/react";

export const highchartsColors = {
  blue: "#2563eb",
  amber: "#d97706",
  green: "#059669",
  violet: "#7c3aed",
  pink: "#db2777",
  teal: "#14b8a6",
  red: "#ef4444",
  sky: "#3b82f6",
  lightBlue: "#60a5fa",
  paleBlue: "#93c5fd",
  lime: "#22c55e",
} as const;

const textStyle = {
  color: "var(--foreground)",
  fontFamily: "var(--font-sans)",
};

const baseLegend = {
  align: "left" as const,
  verticalAlign: "top" as const,
  itemStyle: {
    ...textStyle,
    fontWeight: "500",
  },
  itemHoverStyle: textStyle,
  itemHiddenStyle: {
    color: "var(--muted-foreground)",
  },
};

const baseTooltip = {
  shared: true,
  outside: true,
  backgroundColor: "var(--popover)",
  borderColor: "var(--border)",
  borderRadius: 6,
  style: {
    ...textStyle,
    fontSize: "12px",
  },
};

export function createHighchartsOptions(
  options: HighchartsOptionsType
): HighchartsOptionsType {
  return {
    ...options,
    chart: {
      backgroundColor: "transparent",
      spacing: [8, 8, 8, 8],
      style: textStyle,
      ...options.chart,
    },
    title: {
      text: undefined,
      style: textStyle,
      ...options.title,
    },
    credits: {
      enabled: false,
      ...options.credits,
    },
    accessibility: {
      enabled: false,
      ...options.accessibility,
    },
    exporting: {
      enabled: false,
      ...options.exporting,
    },
    legend: {
      ...baseLegend,
      ...options.legend,
      itemStyle: {
        ...baseLegend.itemStyle,
        ...options.legend?.itemStyle,
      },
      itemHoverStyle: {
        ...baseLegend.itemHoverStyle,
        ...options.legend?.itemHoverStyle,
      },
      itemHiddenStyle: {
        ...baseLegend.itemHiddenStyle,
        ...options.legend?.itemHiddenStyle,
      },
    },
    tooltip: {
      ...baseTooltip,
      ...options.tooltip,
      style: {
        ...baseTooltip.style,
        ...options.tooltip?.style,
      },
    },
  };
}
