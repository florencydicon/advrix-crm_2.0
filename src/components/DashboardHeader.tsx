"use client";

import { useState, useEffect } from "react";
import { CalendarDays } from "lucide-react";

export function Greeting({ firstName }: { firstName: string }) {
  const [greet, setGreet] = useState("");
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreet("Good morning");
    else if (h < 17) setGreet("Good afternoon");
    else setGreet("Good evening");
  }, []);
  return (
    <span>
      {greet ? `${greet}, ${firstName}` : `${firstName}`}
    </span>
  );
}

export function TodayBadge() {
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }));
  }, []);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2">
      <CalendarDays className="h-3.5 w-3.5 text-slate-500" /> {today || "\u00A0"}
    </span>
  );
}
