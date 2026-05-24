"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import Reveal from "./Reveal";

interface NodeData {
  id: string;
  name: string;
  lat: number;  // Latitude in degrees
  lng: number;  // Longitude in degrees
  latStr: string;
  lngStr: string;
  active: string;
  latency: string;
  status: string;
}

const nodes: NodeData[] = [
  { id: "ap-south", name: "MUMBAI, IN", lat: 19.0760, lng: 72.8777, latStr: "19.0760° N", lngStr: "72.8777° E", active: "5,600+", latency: "4.8ms", status: "ACTIVE" },
  { id: "us-west", name: "OREGON, US", lat: 43.8041, lng: -120.5542, latStr: "43.8041° N", lngStr: "120.5542° W", active: "3,102+", latency: "8.2ms", status: "ACTIVE" },
  { id: "us-east", name: "VIRGINIA, US", lat: 38.9072, lng: -77.0369, latStr: "38.9072° N", lngStr: "77.0369° W", active: "4,890+", latency: "5.1ms", status: "ACTIVE" },
  { id: "eu-west", name: "LONDON, UK", lat: 51.5074, lng: -0.1278, latStr: "51.5074° N", lngStr: "0.1278° W", active: "2,980+", latency: "9.4ms", status: "ACTIVE" },
  { id: "eu-central", name: "FRANKFURT, DE", lat: 50.1109, lng: 8.6821, latStr: "50.1109° N", lngStr: "8.6821° E", active: "3,120+", latency: "7.8ms", status: "ACTIVE" },
  { id: "ap-se", name: "SINGAPORE, SG", lat: 1.3521, lng: 103.8198, latStr: "1.3521° N", lngStr: "103.8198° E", active: "2,100+", latency: "6.4ms", status: "ACTIVE" },
  { id: "ap-ne", name: "TOKYO, JP", lat: 35.6762, lng: 139.6503, latStr: "35.6762° N", lngStr: "139.6503° E", active: "1,850+", latency: "9.0ms", status: "ACTIVE" },
  { id: "sa-east", name: "SÃO PAULO, BR", lat: -23.5505, lng: -46.6333, latStr: "23.5505° S", lngStr: "46.6333° W", active: "850+", latency: "14.5ms", status: "ACTIVE" }
];

export default function InfrastructureGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData>(nodes[0]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Sync selectedNode to a ref so the Three.js loop can access the latest state
  const selectedNodeRef = useRef(selectedNode);
  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  // Keep references to target rotations for smooth lerping
  const targetRotation = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  
  // Convert lat/lng to 3D Cartesian coordinates on sphere of given radius
  const convertToXYZ = (lat: number, lng: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -(radius * Math.sin(phi) * Math.sin(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.cos(theta)
    );
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 540;
    const radius = 140;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.0018);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.z = 400;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Create Globe Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // --- DUAL-STAGE ATMOSPHERIC BACKLIGHTING GLO W ---
    // Soft atmospheric aura sphere (Back-side glow)
    const glowGeo = new THREE.SphereGeometry(radius * 1.05, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x0077ff, // Luxury tech deep blue aura
      transparent: true,
      opacity: 0.025,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    globeGroup.add(glowMesh);

    // Orbit coordinate boundary ring
    const boundariesRingGeo = new THREE.RingGeometry(radius * 1.15, radius * 1.155, 64);
    const boundariesRingMat = new THREE.MeshBasicMaterial({
      color: 0x00a8ff, // Subtle cyan neon ring
      transparent: true,
      opacity: 0.035,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const boundariesRing = new THREE.Mesh(boundariesRingGeo, boundariesRingMat);
    boundariesRing.rotation.x = Math.PI / 4;
    globeGroup.add(boundariesRing);

    // 5. Build Wireframe Sphere
    const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.038
    });
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    globeGroup.add(sphereMesh);

    // 6. Build Dot Points Sphere (Dotted technical look)
    const pointsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.25,
      transparent: true,
      opacity: 0.1
    });
    const spherePoints = new THREE.Points(sphereGeometry, pointsMaterial);
    globeGroup.add(spherePoints);

    // 7. Add Equator & Meridians (Thicker structural rings)
    const ringGeo1 = new THREE.RingGeometry(radius - 0.5, radius + 0.5, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide
    });
    
    const equator = new THREE.Mesh(ringGeo1, ringMat);
    equator.rotation.x = Math.PI / 2;
    globeGroup.add(equator);

    const meridian = new THREE.Mesh(ringGeo1, ringMat);
    meridian.rotation.y = Math.PI / 2;
    globeGroup.add(meridian);

    // 8. Place Node Indicators in 3D
    const nodeMeshes: THREE.Mesh[] = [];
    const nodeGroups: THREE.Group[] = [];

    nodes.forEach(node => {
      const pos = convertToXYZ(node.lat, node.lng, radius);
      
      const nodeGroup = new THREE.Group();
      nodeGroup.position.copy(pos);
      
      // Node Dot (Solid white)
      const dotGeo = new THREE.SphereGeometry(3.5, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95
      });
      const dotMesh = new THREE.Mesh(dotGeo, dotMat);
      dotMesh.name = node.id;
      nodeGroup.add(dotMesh);
      nodeMeshes.push(dotMesh);

      // Outer Halo (Thin rotating/pulsing ring)
      const haloGeo = new THREE.RingGeometry(6, 7, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.lookAt(new THREE.Vector3(0, 0, 0));
      nodeGroup.add(haloMesh);

      globeGroup.add(nodeGroup);
      nodeGroups.push(nodeGroup);
    });

    // --- ANIMATED CYAN/BLUE DATA PACKETS SETUP ---
    const packets: Array<{
      curve: THREE.QuadraticBezierCurve3;
      mesh: THREE.Mesh;
      speed: number;
      t: number;
    }> = [];

    const packetGeo = new THREE.SphereGeometry(1.5, 8, 8);
    const packetMat = new THREE.MeshBasicMaterial({
      color: 0x00e1ff, // Cyan neon light packet
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    // 9. Add Connecting 3D Arcs (Beziers between nodes for data pipelines)
    const createConnectionArc = (posA: THREE.Vector3, posB: THREE.Vector3) => {
      const mid = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
      const dist = posA.distanceTo(posB);
      mid.normalize().multiplyScalar(radius + dist * 0.14); // Curve outward based on distance

      const curve = new THREE.QuadraticBezierCurve3(posA, mid, posB);
      const points = curve.getPoints(45);
      const arcGeometry = new THREE.BufferGeometry().setFromPoints(points);
      
      const arcMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.08
      });
      
      const arcLine = new THREE.Line(arcGeometry, arcMaterial);
      globeGroup.add(arcLine);

      // Instanced packet mesh
      const packetMesh = new THREE.Mesh(packetGeo, packetMat);
      globeGroup.add(packetMesh);

      packets.push({
        curve,
        mesh: packetMesh,
        speed: 0.22 + Math.random() * 0.18,
        t: Math.random() // Start at random positions
      });
    };

    // Draw select connecting grid arcs
    const getPos = (id: string) => {
      const node = nodes.find(n => n.id === id)!;
      return convertToXYZ(node.lat, node.lng, radius);
    };

    try {
      createConnectionArc(getPos("us-west"), getPos("us-east"));
      createConnectionArc(getPos("us-east"), getPos("eu-west"));
      createConnectionArc(getPos("eu-west"), getPos("eu-central"));
      createConnectionArc(getPos("eu-central"), getPos("ap-south"));
      createConnectionArc(getPos("ap-south"), getPos("ap-se"));
      createConnectionArc(getPos("ap-se"), getPos("ap-ne"));
      createConnectionArc(getPos("us-east"), getPos("sa-east"));
    } catch (e) {
      console.warn("Connections skip in setup:", e);
    }

    // 10. Lighting (Subtle ambient for depth)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
    scene.add(ambientLight);

    // 11. Mouse & Raycasting Setup
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-9999, -9999);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleMouseClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);
      if (intersects.length > 0) {
        const hitId = intersects[0].object.name;
        const hitNode = nodes.find(n => n.id === hitId);
        if (hitNode) {
          setSelectedNode(hitNode);
        }
      }
    };

    const canvasElement = canvasRef.current;
    canvasElement.addEventListener("mousemove", handleMouseMove);
    canvasElement.addEventListener("click", handleMouseClick);

    // Drag to Rotate logic
    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaMove = {
        x: e.clientX - previousMousePosition.current.x,
        y: e.clientY - previousMousePosition.current.y
      };

      // Drag rotates target directly
      targetRotation.current.y += deltaMove.x * 0.005;
      targetRotation.current.x += deltaMove.y * 0.005;
      
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    canvasElement.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    // 12. Animation loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // If not dragging, auto-rotate slowly
      if (!isDragging.current) {
        targetRotation.current.y += 0.04 * delta;
      }

      // Smooth interpolation (lerp) for rotation angles
      currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.08;
      currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.08;

      globeGroup.rotation.x = currentRotation.current.x;
      globeGroup.rotation.y = currentRotation.current.y;

      // Slow complex orbit shift for boundary coordinates ring
      boundariesRing.rotation.z = time * 0.05;

      // Raycast hovering highlight
      let hoveredIdLocal: string | null = null;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);
      if (intersects.length > 0) {
        hoveredIdLocal = intersects[0].object.name;
        setHoveredNode(hoveredIdLocal);
        document.body.style.cursor = "pointer";
      } else {
        hoveredIdLocal = null;
        setHoveredNode(null);
        document.body.style.cursor = "default";
      }

      // Dynamic Node Glow & Pulsing
      nodeGroups.forEach((g, idx) => {
        const node = nodes[idx];
        const dot = g.children[0] as THREE.Mesh;
        const halo = g.children[1] as THREE.Mesh;
        const dotMat = dot.material as THREE.MeshBasicMaterial;
        const haloMat = halo.material as THREE.MeshBasicMaterial;

        const isSelected = selectedNodeRef.current && selectedNodeRef.current.id === node.id;
        const isHovered = hoveredIdLocal === node.id;

        if (isSelected) {
          dotMat.color.setHex(0x00e1ff); // Neon bright cyan core
          haloMat.color.setHex(0x0077ff); // Neon electric blue halo
          haloMat.opacity = 0.8;
          // Pulse halo
          const pulse = 1.0 + Math.sin(time * 6) * 0.16;
          halo.scale.set(pulse, pulse, pulse);
        } else if (isHovered) {
          dotMat.color.setHex(0x00e1ff);
          haloMat.color.setHex(0x00a8ff);
          haloMat.opacity = 0.55;
          halo.scale.set(1.15, 1.15, 1.15);
        } else {
          dotMat.color.setHex(0xffffff); // Standard premium off-white
          haloMat.color.setHex(0xffffff);
          haloMat.opacity = 0.16;
          halo.scale.set(1.0, 1.0, 1.0);
        }

        if (halo) {
          halo.rotation.z += 0.45 * delta;
        }
      });

      // Update traveling neon cyan data packets
      packets.forEach(p => {
        p.t += p.speed * delta;
        if (p.t > 1) {
          p.t = 0;
          p.speed = 0.22 + Math.random() * 0.18; // recalculate speed variation
        }
        const pos = p.curve.getPointAt(p.t);
        p.mesh.position.copy(pos);
      });

      renderer.render(scene, camera);
    };

    animate();

    // 13. Window Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !renderer) return;
      const w = containerRef.current.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };

    window.addEventListener("resize", handleResize);

    // 14. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      canvasElement.removeEventListener("mousemove", handleMouseMove);
      canvasElement.removeEventListener("click", handleMouseClick);
      canvasElement.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      
      // Dispose materials/geometries
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      pointsMaterial.dispose();
      ringGeo1.dispose();
      ringMat.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      boundariesRingGeo.dispose();
      boundariesRingMat.dispose();
      packetGeo.dispose();
      packetMat.dispose();
      renderer.dispose();
    };
  }, []);

  // Handle clicking tabular menu to trigger centering
  const triggerNodeCentering = (node: NodeData) => {
    setSelectedNode(node);
    
    // Calculate polar angles to rotate globe and face selected node to screen
    const phi = (90 - node.lat) * (Math.PI / 180);
    const theta = (node.lng + 180) * (Math.PI / 180);
    
    // Set target rotation to look precisely at coordinates
    targetRotation.current.x = phi - Math.PI / 2;
    targetRotation.current.y = -theta;
  };

  return (
    <section className="infrastructure-section" style={{ padding: "10rem 0", position: "relative", overflow: "hidden", background: "var(--bg-base)", borderBottom: "1px solid var(--border-main)" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 4rem", display: "flex", flexDirection: "column", gap: "5rem" }}>
        
        {/* Header Grid */}
        <div className="section-structural-title" style={{ margin: 0 }}>
          <Reveal delay={0.2}>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 300, color: "#fff" }}>
              Global 3D Decoupled Core
            </h2>
          </Reveal>
          <Reveal delay={0.3}>
            <p style={{ fontSize: "1.05rem", color: "var(--text-secondary)", fontWeight: 300, lineHeight: 1.6 }}>
              Experience deterministic edge scale in real-time. Hover or tap direct geographic nodes on the custom WebGL immersive 3D grid below to inspect live latency logs and database sync records.
            </p>
          </Reveal>
        </div>

        {/* 3D Immersive Frame */}
        <Reveal delay={0.4} width="100%">
          <div 
            ref={containerRef}
            style={{ 
              display: "grid", 
              gridTemplateColumns: "1.7fr 1fr", 
              border: "1px solid var(--border-main)",
              backgroundColor: "var(--bg-surface)",
              position: "relative",
              height: "540px",
              width: "100%",
              overflow: "hidden"
            }}
          >
            {/* 3D WebGL Canvas Layer */}
            <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", cursor: "grab" }}>
              {/* Immersive Background Glows behind Globe */}
              <div className="glow-blob glow-blob-neonblue glow-blob-animated-2" style={{ width: "550px", height: "550px", top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.95, zIndex: 0 }} />
              <div className="glow-blob glow-blob-cyberpink glow-blob-animated-1" style={{ width: "450px", height: "450px", top: "45%", left: "45%", transform: "translate(-50%, -50%)", opacity: 0.6, zIndex: 0 }} />

              {/* Background HUD tech lines overlay */}
              <div 
                style={{ 
                  position: "absolute", 
                  inset: 0, 
                  backgroundImage: "radial-gradient(rgba(255,255,255,0.015) 1px, transparent 1px)", 
                  backgroundSize: "20px 20px", 
                  pointerEvents: "none", 
                  zIndex: 1 
                }} 
              />
              <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%", zIndex: 2 }} />

              {/* Float HUD coordinate ticks on the left */}
              <div style={{ position: "absolute", top: "2rem", left: "2rem", fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-muted)", zIndex: 10, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span>HUD.V3_NODE_ACCESS // ONLINE</span>
                <span>FOV.ANGLE: 45.000°</span>
                <span>RENDER.ZONE: WEBGL_2.0</span>
              </div>
            </div>

            {/* Premium Monospace HUD Control Console */}
            <div 
              style={{ 
                borderLeft: "1px solid var(--border-main)", 
                display: "flex", 
                flexDirection: "column", 
                justifyContent: "space-between",
                padding: "3rem",
                backgroundColor: "rgba(5, 5, 5, 0.4)",
                backdropFilter: "blur(20px)",
                height: "100%",
                overflowY: "auto"
              }}
            >
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: "1.5rem" }}>
                  SYSTEM REGISTER // GLOBAL INDEX
                </div>

                {/* Tab Selector List */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "3rem" }}>
                  {nodes.map(node => (
                    <button
                      key={node.id}
                      onClick={() => triggerNodeCentering(node)}
                      className={`globe-console-btn ${selectedNode.id === node.id ? "active" : ""}`}
                    >
                      {node.id.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Selected Node Details Readout */}
                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "2rem" }}>
                  <h4 style={{ fontFamily: "var(--font-serif)", fontSize: "1.8rem", fontWeight: 300, color: "#fff", marginBottom: "1.5rem" }}>
                    {selectedNode.name}
                  </h4>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>COORDINATES</span>
                      <span style={{ color: "#fff" }}>{selectedNode.latStr} / {selectedNode.lngStr}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>EDGE LATENCY</span>
                      <span style={{ color: "#fff" }}>{selectedNode.latency}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>ACTIVE SYNC SESSIONS</span>
                      <span style={{ color: "#fff" }}>{selectedNode.active}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>TELEMETRY STATUS</span>
                      <span style={{ color: "#fff", fontWeight: 600 }}>{selectedNode.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical instructions ticker */}
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "1.5rem", marginTop: "2rem" }}>
                <span>[ DRAG GLOBE IN VIEWPORT TO ROTATE CAMERA // TAP NODES TO CENTER DATA PIPELINE ]</span>
              </div>
            </div>

          </div>
        </Reveal>

      </div>
    </section>
  );
}
