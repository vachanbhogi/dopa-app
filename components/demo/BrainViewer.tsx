"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

type BrainRegion = {
  region: string;
  hemisphere: string;
  importance: number;
  modality: string;
};

const REGION_POSITIONS: Record<string, [number, number, number]> = {
  "S_temporal_inf_lh": [-1.3, -0.7, 0.6],
  "S_temporal_inf_rh": [1.3, -0.7, 0.6],
  "G_temporal_inf_lh": [-1.2, -0.8, 0.4],
  "G_temporal_inf_rh": [1.2, -0.8, 0.4],
  "S_circular_insula_ant_lh": [-0.9, 0.1, 0.7],
  "S_circular_insula_ant_rh": [0.9, 0.1, 0.7],
  "S_front_middle_lh": [-0.7, 0.8, 0.5],
  "S_front_middle_rh": [0.7, 0.8, 0.5],
  "S_oc_temp_lat_lh": [-1.1, -0.5, -0.5],
  "S_oc_temp_lat_rh": [1.1, -0.5, -0.5],
  "G_front_sup_lh": [-0.4, 1.1, 0.2],
  "G_front_sup_rh": [0.4, 1.1, 0.2],
  "S_intrapariet_and_P_trans_lh": [-0.8, 0.4, -0.6],
  "S_intrapariet_and_P_trans_rh": [0.8, 0.4, -0.6],
  "G_temp_sup-Lateral_lh": [-1.4, -0.2, 0.5],
  "G_temp_sup-Lateral_rh": [1.4, -0.2, 0.5],
  "G_insular_short_lh": [-0.8, 0.0, 0.6],
  "G_insular_short_rh": [0.8, 0.0, 0.6],
  "S_calcarine_lh": [-0.3, -0.3, -1.2],
  "S_calcarine_rh": [0.3, -0.3, -1.2],
};

function getRegionKey(region: string, hemisphere: string): string {
  return `${region}_${hemisphere}`;
}

/* ─── Simplex-ish noise for organic surface ─── */
function fbm(x: number, y: number, z: number): number {
  let val = 0;
  let amp = 1;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    val += amp * (Math.sin(x * freq + y * freq * 0.7) * Math.cos(y * freq + z * freq * 1.3) * Math.sin(z * freq + x * freq * 0.9));
    amp *= 0.5;
    freq *= 2.1;
  }
  return val;
}

/* ─── Brain geometry with gyri/sulci ─── */
function createBrainGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 96, 72);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    // Brain proportions: wider left-right, elongated front-back, shorter top-bottom
    v.x *= 1.35;
    v.y *= 1.05;
    v.z *= 1.2;

    // Flatten bottom slightly
    if (v.y < -0.3) {
      v.y *= 0.85 + 0.15 * (1 + v.y / 1.05);
    }

    // Longitudinal fissure (midline groove)
    const midlineDist = Math.abs(v.x);
    if (midlineDist < 0.15 && v.y > 0.2) {
      v.y -= (0.15 - midlineDist) * 1.8 * Math.max(0, (v.y - 0.2));
    }

    // Temporal lobe bulge
    const tempFactor = Math.exp(-((v.y + 0.5) ** 2) * 3) * Math.exp(-((v.z - 0.3) ** 2) * 2);
    v.x *= 1 + tempFactor * 0.15 * Math.sign(v.x);

    // Frontal lobe extension
    const frontalFactor = Math.exp(-((v.z - 1.0) ** 2) * 2) * Math.max(0, 0.5 - Math.abs(v.y));
    v.z += frontalFactor * 0.2;

    // Occipital pole
    const occFactor = Math.exp(-((v.z + 1.1) ** 2) * 3) * Math.max(0, 0.4 - Math.abs(v.y));
    v.z -= occFactor * 0.1;

    // Sulci/gyri wrinkles
    const noise1 = fbm(v.x * 3.5, v.y * 3.5, v.z * 3.5) * 0.06;
    const noise2 = fbm(v.x * 7, v.y * 7, v.z * 7) * 0.025;
    const len = v.length();
    v.normalize().multiplyScalar(len + noise1 + noise2);

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

/* ─── Brain mesh with vertex colors for activations ─── */
function BrainMesh({ regions, maxImportance }: { regions: BrainRegion[]; maxImportance: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
    }
  });

  const geometry = useMemo(() => createBrainGeometry(), []);

  // Compute vertex colors based on region proximity
  const coloredGeo = useMemo(() => {
    const geo = geometry.clone();
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const baseColor = new THREE.Color("#e8ddd3");
    const v = new THREE.Vector3();

    const activeRegions = regions.map((r) => {
      const key = getRegionKey(r.region, r.hemisphere);
      const p = REGION_POSITIONS[key];
      if (!p) return null;
      return { pos: new THREE.Vector3(...p), intensity: r.importance / maxImportance, modality: r.modality };
    }).filter(Boolean) as { pos: THREE.Vector3; intensity: number; modality: string }[];

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      let maxActivation = 0;
      let activationColor = new THREE.Color("#e8ddd3");

      for (const region of activeRegions) {
        const dist = v.distanceTo(region.pos);
        const falloff = Math.exp(-(dist * dist) * 2.5);
        const activation = falloff * region.intensity;

        if (activation > maxActivation) {
          maxActivation = activation;
          const hot = region.modality === "video"
            ? new THREE.Color("#6366f1")
            : new THREE.Color("#f59e0b");
          activationColor = hot;
        }
      }

      const finalColor = baseColor.clone().lerp(activationColor, Math.min(1, maxActivation * 1.8));
      colors[i * 3] = finalColor.r;
      colors[i * 3 + 1] = finalColor.g;
      colors[i * 3 + 2] = finalColor.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [geometry, regions, maxImportance]);

  const activeRegions = useMemo(() => {
    return regions.map((r) => {
      const key = getRegionKey(r.region, r.hemisphere);
      const p = REGION_POSITIONS[key];
      if (!p) return null;
      return { ...r, pos: p, intensity: r.importance / maxImportance };
    }).filter(Boolean) as (BrainRegion & { pos: [number, number, number]; intensity: number })[];
  }, [regions, maxImportance]);

  return (
    <group ref={groupRef}>
      {/* Main brain surface */}
      <mesh geometry={coloredGeo}>
        <meshStandardMaterial
          vertexColors
          roughness={0.55}
          metalness={0.05}
          envMapIntensity={0.4}
        />
      </mesh>

      {/* Subtle wireframe for cortical texture */}
      <mesh geometry={coloredGeo}>
        <meshBasicMaterial
          wireframe
          color="#ffffff"
          transparent
          opacity={0.015}
        />
      </mesh>

      {/* Glow spots at active regions */}
      {activeRegions.map((r) => (
        <GlowSpot
          key={`${r.region}-${r.hemisphere}`}
          position={r.pos}
          intensity={r.intensity}
          modality={r.modality}
        />
      ))}
    </group>
  );
}

function GlowSpot({ position, intensity, modality }: {
  position: [number, number, number];
  intensity: number;
  modality: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const color = modality === "video" ? "#818cf8" : "#fbbf24";
  const size = 0.08 + intensity * 0.14;

  useFrame((state) => {
    if (ref.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3 + intensity * 5) * 0.2;
      ref.current.scale.setScalar(pulse);
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[size, 12, 12]} />
      <meshBasicMaterial color={color} transparent opacity={0.7 + intensity * 0.25} toneMapped={false} />
    </mesh>
  );
}

/* ─── Exported component ─── */
export function BrainViewer({ regions }: { regions: BrainRegion[] }) {
  const maxImportance = Math.max(...regions.map((r) => r.importance));

  return (
    <div className="relative w-full rounded-xl border border-white/6 bg-linear-to-b from-[#0a0a12] to-[#06060a] overflow-hidden" style={{ height: 440 }}>
      <Canvas
        camera={{ position: [0, 0.3, 4.2], fov: 40 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
      >
        <color attach="background" args={["#08080f"]} />
        <fog attach="fog" args={["#08080f", 6, 12]} />

        <ambientLight intensity={0.3} />
        <directionalLight position={[3, 4, 5]} intensity={1.2} color="#f0eee8" />
        <directionalLight position={[-2, -1, -3]} intensity={0.3} color="#6366f1" />
        <pointLight position={[0, 2, 2]} intensity={0.5} color="#c4b5fd" distance={6} />
        <pointLight position={[-2, -1, 1]} intensity={0.3} color="#fbbf24" distance={5} />

        <BrainMesh regions={regions} maxImportance={maxImportance} />

        <OrbitControls
          enableZoom
          enablePan={false}
          minDistance={2.8}
          maxDistance={7}
          autoRotate={false}
          enableDamping
          dampingFactor={0.05}
        />

        <Environment preset="night" />
      </Canvas>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 rounded-lg bg-black/60 backdrop-blur-sm px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] text-white/70">
          <span className="inline-block h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.6)]" />
          Video cortical regions
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/70">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
          Text-audio cortical regions
        </div>
      </div>

      <div className="absolute top-4 right-4 text-[10px] text-white/30">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}
