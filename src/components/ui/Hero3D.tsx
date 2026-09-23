import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Points, PointMaterial, Environment, ContactShadows, Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from 'next-themes';

function ParticleSwarm({ count = 100 }) {
  const mesh = useRef<THREE.Points>(null);

  // Generate random positions
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 10;
  }

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x = state.clock.getElapsedTime() * 0.05;
      mesh.current.rotation.y = state.clock.getElapsedTime() * 0.075;
    }
  });

  return (
    <Points ref={mesh} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#10b981" // Emerald
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </Points>
  );
}

function FloatingShapes() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  return (
    <>
      {/* Central "Seed" or Bio-molecule shape */}
      <Float speed={2} rotationIntensity={1} floatIntensity={2} position={[0, 0, 0]}>
        <Sphere args={[1, 64, 64]} position={[2, 0, -2]}>
          <MeshDistortMaterial
            color={isDark ? "#8b5cf6" : "#7c3aed"} // Violet
            envMapIntensity={1}
            clearcoat={1}
            clearcoatRoughness={0.1}
            metalness={0.8}
            roughness={0.2}
            distort={0.4}
            speed={2}
          />
        </Sphere>
      </Float>

      {/* Secondary Shape */}
      <Float speed={1.5} rotationIntensity={1.5} floatIntensity={1.5} position={[-3, 1, -3]}>
        <Sphere args={[0.7, 32, 32]}>
          <MeshDistortMaterial
            color={isDark ? "#10b981" : "#059669"} // Emerald
            envMapIntensity={1}
            clearcoat={1}
            clearcoatRoughness={0.2}
            metalness={0.5}
            roughness={0.1}
            distort={0.3}
            speed={3}
          />
        </Sphere>
      </Float>

      {/* Another small shape */}
      <Float speed={3} rotationIntensity={2} floatIntensity={2} position={[3, -1.5, -1]}>
        <Sphere args={[0.5, 32, 32]}>
          <MeshDistortMaterial
            color={isDark ? "#0ea5e9" : "#0284c7"} // Sky
            envMapIntensity={1}
            clearcoat={1}
            clearcoatRoughness={0.1}
            metalness={0.9}
            roughness={0.1}
            distort={0.5}
            speed={2.5}
          />
        </Sphere>
      </Float>
    </>
  );
}

export function Hero3D() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none opacity-60 mix-blend-screen dark:mix-blend-lighten">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#8b5cf6" />

        <FloatingShapes />
        <ParticleSwarm count={300} />

        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
