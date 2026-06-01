"use client";

import AnimatedCounter from "@/components/AnimatedCounter";

const stats = [
  { value: 1200, suffix: "+", label: "Schools Onboarded", icon: "🏫" },
  { value: 50000, suffix: "+", label: "Students Managed", icon: "🎓" },
  { value: 99, suffix: ".9%", label: "Platform Uptime", icon: "⚡" },
  { value: 15, suffix: "M+", label: "Transactions Processed", icon: "💳" },
];

export default function StatsSection() {
  return (
    <section className="stats-section">
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-value">
              <AnimatedCounter target={stat.value} suffix={stat.suffix} duration={2200} />
            </div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
