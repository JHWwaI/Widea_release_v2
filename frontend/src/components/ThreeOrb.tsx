"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, Float } from "@react-three/drei";
import type { Mesh } from "three";

function OrbMesh() {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.16;
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.4) * 0.08;
  });

  return (
    <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.6}>
      <Sphere ref={ref} args={[1.55, 128, 128]}>
        <MeshDistortMaterial
          color="#a1a1aa"
          distort={0.38}
          speed={1.6}
          roughness={0.04}
          metalness={0.85}
        />
      </Sphere>
    </Float>
  );
}

export default function ThreeOrb({ className = "" }: { className?: string }) {
  return (
    <div className={className} style={{ position: "relative" }}>
      {/* CSS glow halo under orb */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          margin: "auto",
          width: "55%",
          height: "55%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse,rgba(93,93,255,0.45) 0%,rgba(168,85,247,0.2) 40%,transparent 70%)",
          filter: "blur(40px)",
          transform: "translateY(20%)",
          pointerEvents: "none",
        }}
      />
      <Canvas
        camera={{ position: [0, 0, 4.6], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.08} />
        <pointLight position={[4, 3, 4]} intensity={2.2} color="#a1a1aa" />
        <pointLight position={[-4, -2, -3]} intensity={1.8} color="#a1a1aa" />
        <pointLight position={[0, 5, 1]} intensity={0.6} color="#818CF8" />
        <Suspense fallback={null}>
          <OrbMesh />
        </Suspense>
      </Canvas>
    </div>
  );
}
