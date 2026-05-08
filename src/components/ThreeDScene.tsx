import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';

const ParticleField = () => {
  const ref = useRef<THREE.Points>(null);
  const count = 2000;
  
  const particles = useMemo(() => {
    const points = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      points[i * 3] = (Math.random() - 0.5) * 4;
      points[i * 3 + 1] = (Math.random() - 0.5) * 4;
      points[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    return points;
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      // Gentle floating motion
      ref.current.rotation.x += delta * 0.05;
      ref.current.rotation.y += delta * 0.03;
      
      // Subtle "handheld" camera jitter
      const time = state.clock.getElapsedTime();
      ref.current.position.x = Math.sin(time * 0.2) * 0.1;
      ref.current.position.y = Math.cos(time * 0.3) * 0.05;
    }
  });

  return (
    <group>
      <Points ref={ref} positions={particles} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#10b981"
          size={0.015}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </Points>
      {/* Second layer for diverse "dust" sizes */}
      <Points positions={particles.slice(0, 300)} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#ffffff"
          size={0.005}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.6}
        />
      </Points>
    </group>
  );
};

const ThreeDScene: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 bg-black">
      <Canvas camera={{ position: [0, 0, 1] }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <ParticleField />
          </Float>
        </Suspense>
      </Canvas>
    </div>
  );
};

export default ThreeDScene;
