"use client";

import { useState, useRef, useEffect, useId } from "react";
import { scaleLinear } from "d3-scale";
import { subMonths, format } from "date-fns";
import { useResizeObserver } from "usehooks-ts";
import { useAIState } from "ai/rsc";
interface Stock {
  result: any[];
}

export function PriceChat({ result: rawData }: any) {
  const id = useId();
  const symbol = "FLOW";
  const result: { price: number; [key: string]: any }[] = JSON.parse(
    rawData.content[0].text
  );
  const price = result[result.length - 1].price;
  const closedAt = result[result.length - 1].timestamp;
  const delta = price - result[result.length - 2].price;

  const [priceAtTime, setPriceAtTime] = useState({
    time: format(closedAt, "dd LLL yy"),
    value: price.toFixed(2),
    x: 0,
  });

  const [startHighlight, setStartHighlight] = useState(0);
  const [endHighlight, setEndHighlight] = useState(0);

  const chartRef = useRef<HTMLDivElement>(null);
  const { width = 0 } = useResizeObserver({
    ref: chartRef,
    box: "border-box",
  });

  // Find minimum and maximum prices
  const minPrice = Math.min(...result.map((item) => item.price));
  const maxPrice = Math.max(...result.map((item) => item.price));

  const xToDate = (x: number) => {
    let length = result.length;
    const ratio = x / width;
    const idx = Math.floor(ratio * length);

    const timestamp = result[idx].timestamp * 1000;
    return new Date(timestamp);
  };
  const xToValue = (x: number) => {
    let length = result.length;
    const ratio = x / width;
    const idx = Math.floor(ratio * length);
    return result[idx].price;
  };
  // Create y-axis scale to map prices to SVG coordinate system y values
  const yScale = scaleLinear().domain([minPrice, maxPrice]).range([168, 0]); // SVG height is 168, y-axis grows from top to bottom, so range is reversed

  // Generate SVG path from price data
  const generatePathFromPriceData = (data: any[], yScale: any) => {
    if (!data || data.length === 0) return "";

    // SVG view width is 250
    const svgWidth = width;
    // Calculate x coordinate interval for each data point
    const xStep = svgWidth / (data.length - 1);

    // Start building path string from first point
    let path = `M -1 ${yScale(data[0].price)}`;

    // Add all data points
    for (let i = 1; i < data.length; i++) {
      const x = i * xStep;
      const y = yScale(data[i].price);
      path += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }

    // Add closing path for area fill
    path += ` L ${svgWidth} ${svgWidth} L 0 ${svgWidth} Z`;

    return path;
  };

  useEffect(() => {
    if (startHighlight && endHighlight) {
      const message = {
        id,
        role: "system" as const,
        content: `[User has highlighted dates between between ${format(
          xToDate(startHighlight),
          "d LLL"
        )} and ${format(xToDate(endHighlight), "d LLL, yyyy")}`,
      };

      // if (aiState.messages[aiState.messages.length - 1]?.id === id) {
      //   setAIState({
      //     ...aiState,
      //     messages: [...aiState.messages.slice(0, -1), message],
      //   });
      // } else {
      //   setAIState({
      //     ...aiState,
      //     messages: [...aiState.messages, message],
      //   });
      // }
    }
  }, [startHighlight, endHighlight]);

  return (
    <div className="rounded-xl border bg-zinc-950 p-4 text-green-400">
      <div className="float-right inline-block rounded-full bg-white/10 px-2 py-1 text-xs">
        {`${delta > 0 ? "+" : ""}${((delta / price) * 100).toFixed(2)}% ${
          delta > 0 ? "↑" : "↓"
        }`}
      </div>
      <div className="text-lg text-zinc-300">{symbol}</div>
      <div className="text-3xl font-bold">${priceAtTime.value}</div>
      <div className="text mt-1 text-xs text-zinc-500">
        Closed: {priceAtTime.time}
      </div>

      <div
        className="relative -mx-4 cursor-col-resize"
        onPointerDown={(event) => {
          if (chartRef.current) {
            const { clientX } = event;
            const { left } = chartRef.current.getBoundingClientRect();
            const x = clientX - left;
            setStartHighlight(x);
            setEndHighlight(0);

            setPriceAtTime({
              time: format(xToDate(x), "dd LLL yy"),
              value: xToValue(x).toFixed(2),
              x: x,
            });
          }
        }}
        onPointerUp={(event) => {
          if (chartRef.current) {
            const { clientX } = event;
            const { left } = chartRef.current.getBoundingClientRect();
            const x = clientX - left;
            setEndHighlight(x);
          }
        }}
        onPointerMove={(event) => {
          if (chartRef.current) {
            const { clientX } = event;
            const { left } = chartRef.current.getBoundingClientRect();
            const x = clientX - left;
            const data = {
              time: format(xToDate(x), "dd LLL yy"),
              value: xToValue(x).toFixed(2),
              x: clientX - left,
            };
            // console.log(clientX, left, "~~~");
            // console.log(data);
            setPriceAtTime(data);
          }
        }}
        onPointerLeave={() => {
          setPriceAtTime({
            time: format(closedAt, "dd LLL yy"),
            value: price.toFixed(2),
            x: 0,
          });
        }}
        ref={chartRef}
      >
        {priceAtTime.x > 0 ? (
          <div
            className="pointer-events-none absolute z-10 flex w-fit select-none gap-2 rounded-md bg-zinc-800 p-2"
            style={{
              left: priceAtTime.x - 124 / 2,
              top: 30,
            }}
          >
            <div className="text-xs tabular-nums">${priceAtTime.value}</div>
            <div className="text-xs tabular-nums text-zinc-400">
              {priceAtTime.time}
            </div>
          </div>
        ) : null}

        {startHighlight ? (
          <div
            className="pointer-events-none absolute h-32 w-5 select-none rounded-md border border-zinc-500 bg-zinc-500/20"
            style={{
              left: startHighlight,
              width: endHighlight
                ? endHighlight - startHighlight
                : priceAtTime.x - startHighlight,
              bottom: 0,
            }}
          ></div>
        ) : null}

        <svg
          viewBox="0 0 250.0 168.0"
          height="180"
          width="100%"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id="fill-id-tsuid_31"
              x1="0%"
              x2="0%"
              y1="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#34a853" stopOpacity="0.38"></stop>
              <stop offset="13%" stopColor="#e6f4ea" stopOpacity="0"></stop>
            </linearGradient>
            <clipPath id="range-id-tsuid_31">
              <rect height="100%" width="0" x="0" y="0"></rect>
            </clipPath>
            <defs>
              <linearGradient
                id="chart-grad-_f1bJZYLUHqWpxc8Prs2meA_33"
                x1="0%"
                x2="0%"
                y1="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#34a853" stopOpacity="0.38"></stop>
                <stop offset="23%" stopColor="#e6f4ea" stopOpacity="0"></stop>
              </linearGradient>
            </defs>
            <clipPath id="mask-_f1bJZYLUHqWpxc8Prs2meA_32">
              <rect height="218" width="250" x="0" y="-5"></rect>
            </clipPath>
          </defs>

          <path
            clipPath="url(#mask-_f1bJZYLUHqWpxc8Prs2meA_32)"
            d={generatePathFromPriceData(result, yScale)}
            vectorEffect="non-scaling-stroke"
            stroke="#34a853"
            style={{ fill: "url(#chart-grad-_f1bJZYLUHqWpxc8Prs2meA_33)" }}
          ></path>
        </svg>
      </div>
    </div>
  );
}
