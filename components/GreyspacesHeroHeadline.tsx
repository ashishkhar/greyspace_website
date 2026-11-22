"use client";

import { useEffect, useState } from "react";

const DEFAULT_LINES = [
  "Explore Your Design Vision",
  "Your Space, Visualized",
  "Step Into Your Future Space",
];

export default function GreyspacesHeroHeadline({ lines = DEFAULT_LINES }: { lines?: string[] }) {
  const list = lines.length ? lines : DEFAULT_LINES;
  const [i, setI] = useState(0);

  useEffect(() => {
    if (list.length < 2) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % list.length), 5200);
    return () => window.clearInterval(t);
  }, [list.length]);

  return (
    <h1 className="font-display text-4xl font-medium leading-tight tracking-tight text-zinc-100 sm:text-5xl md:text-6xl">
      <span key={i} className="block animate-greyspaces-in">
        {list[i % list.length]}
      </span>
    </h1>
  );
}
