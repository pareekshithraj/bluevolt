"use client";

import dynamic from "next/dynamic";

const InfrastructureGlobe = dynamic(() => import("./InfrastructureGlobe"), {
    ssr: false,
    loading: () => (
        <div style={{ height: '600px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
            Initializing Geospatial Core...
        </div>
    )
});

export default InfrastructureGlobe;
