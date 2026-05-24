"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function FuturisticHero3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Track scroll position to fade out and pause render loop for performance
  const scrollY = useRef(0);
  const isOffscreen = useRef(false);

  // Track mouse coordinates for subtle parallax tilt
  const mouse = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    let width = containerRef.current.clientWidth;
    let height = containerRef.current.clientHeight || 720;

    // 1. Create Scene & Fog for depth
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.002);

    // 2. Perspective Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.z = 320;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Create main group for all wireframes
    const sculptureGroup = new THREE.Group();
    scene.add(sculptureGroup);

    // --- NESTED LUXURY GEOMETRY SETUP ---
    
    // Geometry A: Outer Icosahedron Wireframe (Luxury Off-White)
    const outerRadius = 80;
    const outerGeo = new THREE.IcosahedronGeometry(outerRadius, 1);
    
    // We get a wireframe representation
    const outerWireGeo = new THREE.WireframeGeometry(outerGeo);
    const outerMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.065,
      blending: THREE.AdditiveBlending
    });
    const outerWireframe = new THREE.LineSegments(outerWireGeo, outerMat);
    sculptureGroup.add(outerWireframe);

    // Add glowing vertex points for the outer structure
    const outerPointsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.2,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const outerPoints = new THREE.Points(outerGeo, outerPointsMat);
    sculptureGroup.add(outerPoints);

    // Geometry B: Inner Octahedron (Subtle Neon Electric Blue)
    const innerRadius = 52;
    const innerGeo = new THREE.OctahedronGeometry(innerRadius, 1);
    const innerWireGeo = new THREE.WireframeGeometry(innerGeo);
    const innerMat = new THREE.LineBasicMaterial({
      color: 0x0077ff, // Electric tech blue
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending
    });
    const innerWireframe = new THREE.LineSegments(innerWireGeo, innerMat);
    sculptureGroup.add(innerWireframe);

    // Add floating cyan/blue vertex points inside
    const innerPointsMat = new THREE.PointsMaterial({
      color: 0x00e1ff, // Cyan neon glow core
      size: 3.5,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    const innerPoints = new THREE.Points(innerGeo, innerPointsMat);
    sculptureGroup.add(innerPoints);

    // Geometry C: Delicate Orbital Horizontal Rings (Tilted)
    const ringGeo = new THREE.RingGeometry(110, 110.5, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00a8ff, // Subtle blue glow ring
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    const orbitalRing = new THREE.Mesh(ringGeo, ringMat);
    orbitalRing.rotation.x = Math.PI / 2.3;
    orbitalRing.rotation.y = Math.PI / 6;
    sculptureGroup.add(orbitalRing);

    // --- SUBTLE AMBIENT LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.02);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x0077ff, 0.8, 500);
    pointLight.position.set(0, 0, 150);
    scene.add(pointLight);

    // --- EVENTS HANDLING ---

    // Parallax mouse movement handler
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates from -0.5 to 0.5
      mouse.current.x = (e.clientX / window.innerWidth) - 0.5;
      mouse.current.y = (e.clientY / window.innerHeight) - 0.5;

      // Set target rotation based on normalized coordinates (max 0.25 radian tilt)
      targetRotation.current.y = mouse.current.x * 0.35;
      targetRotation.current.x = mouse.current.y * 0.35;
    };

    // Scroll listener to fade structure and pause WebGL loops when offscreen
    const handleScroll = () => {
      scrollY.current = window.scrollY;
      
      // Calculate opacity fade out as scroll progresses
      const fadeThreshold = 650;
      if (canvasRef.current) {
        const opacity = Math.max(0, 1 - scrollY.current / fadeThreshold);
        canvasRef.current.style.opacity = opacity.toString();
        canvasRef.current.style.transform = `translateY(${scrollY.current * 0.22}px)`; // Parallax shift
      }

      // Pause drawing loop if completely scrolled down past hero
      if (scrollY.current > 760) {
        isOffscreen.current = true;
      } else {
        isOffscreen.current = false;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll, { passive: true });

    // --- ANIMATION LOOP ---
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Skip render if offscreen to optimize performance
      if (isOffscreen.current) return;

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // 1. Gentle continuous rotations (Opposing directions for outer and inner structures)
      outerWireframe.rotation.y = elapsed * 0.035;
      outerWireframe.rotation.x = elapsed * 0.015;
      outerPoints.rotation.y = elapsed * 0.035;
      outerPoints.rotation.x = elapsed * 0.015;

      innerWireframe.rotation.y = -elapsed * 0.045;
      innerWireframe.rotation.z = elapsed * 0.025;
      innerPoints.rotation.y = -elapsed * 0.045;
      innerPoints.rotation.z = elapsed * 0.025;

      orbitalRing.rotation.z = -elapsed * 0.012;

      // 2. Slow breathing pulse in geometry scale (Futuristic life signature)
      const scalePulse = 1 + Math.sin(elapsed * 1.5) * 0.022;
      outerWireframe.scale.set(scalePulse, scalePulse, scalePulse);
      outerPoints.scale.set(scalePulse, scalePulse, scalePulse);
      
      const innerScalePulse = 1 - Math.cos(elapsed * 1.5) * 0.03;
      innerWireframe.scale.set(innerScalePulse, innerScalePulse, innerScalePulse);
      innerPoints.scale.set(innerScalePulse, innerScalePulse, innerScalePulse);

      // 3. Smooth mouse parallax tilt interpolation (lerp)
      currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.05;
      currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.05;

      sculptureGroup.rotation.x = currentRotation.current.x;
      sculptureGroup.rotation.y = currentRotation.current.y;

      // 4. Render
      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !renderer) return;
      width = containerRef.current.clientWidth;
      height = containerRef.current.clientHeight || 720;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // --- CLEANUP ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);

      // Clean up WebGL resources to avoid memory leaks
      outerGeo.dispose();
      outerWireGeo.dispose();
      outerMat.dispose();
      outerPointsMat.dispose();
      
      innerGeo.dispose();
      innerWireGeo.dispose();
      innerMat.dispose();
      innerPointsMat.dispose();

      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: "absolute", 
        inset: 0, 
        width: "100%", 
        height: "100%", 
        overflow: "hidden", 
        pointerEvents: "none",
        zIndex: 1
      }}
    >
      <canvas 
        ref={canvasRef} 
        style={{ 
          display: "block", 
          width: "100%", 
          height: "100%", 
          opacity: 1,
          transition: "opacity 0.1s ease-out, transform 0.1s ease-out",
          willChange: "opacity, transform"
        }} 
      />
    </div>
  );
}
