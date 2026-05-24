"use client";

import dynamic from "next/dynamic";

const DynamicHero3D = dynamic(() => import("./FuturisticHero3D"), {
  ssr: false,
  loading: () => <div style={{ position: 'absolute', inset: 0, opacity: 0.15 }} />
});

export default function FuturisticHero3DWrapper() {
  return <DynamicHero3D />;
}
