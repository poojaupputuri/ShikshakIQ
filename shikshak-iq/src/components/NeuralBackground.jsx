import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ==========================================
// ADVANCED PARTICLE SYSTEM
// ==========================================
function ParticleSystem({ count = 400 }) {
  const meshRef = useRef();
  const { pointer } = useThree();

  const { positions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);

    const colorPalette = [
      new THREE.Color('#8b5cf6'), // purple
      new THREE.Color('#3b82f6'), // blue
      new THREE.Color('#06b6d4'), // cyan
      new THREE.Color('#ec4899'), // pink
      new THREE.Color('#10b981'), // green
      new THREE.Color('#f59e0b'), // amber
    ];

    for (let i = 0; i < count; i++) {
      const radius = 5 + Math.random() * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.cos(phi);
      pos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;

      // Varied sizes for depth effect
      siz[i] = 0.02 + Math.random() * 0.06;
    }

    return { positions: pos, colors: col, sizes: siz };
  }, [count]);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      // Slow rotation with subtle oscillation
      meshRef.current.rotation.y = time * 0.015;
      meshRef.current.rotation.x = Math.sin(time * 0.008) * 0.05;
      // Mouse-reactive tilt
      meshRef.current.rotation.x += pointer.y * 0.0003;
      meshRef.current.rotation.z += pointer.x * 0.0003;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ==========================================
// PULSING NEURAL CONNECTIONS
// ==========================================
function NeuralConnections() {
  const lineRef = useRef();
  const count = 60;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const org = new THREE.Vector3(
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 22
      );
      const dest = new THREE.Vector3(
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 22
      );
      pos[i * 6] = org.x;
      pos[i * 6 + 1] = org.y;
      pos[i * 6 + 2] = org.z;
      pos[i * 6 + 3] = dest.x;
      pos[i * 6 + 4] = dest.y;
      pos[i * 6 + 5] = dest.z;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (lineRef.current) {
      // Pulse opacity gently
      const pulse = 0.06 + Math.sin(state.clock.elapsedTime * 0.4) * 0.04;
      lineRef.current.material.opacity = pulse;
    }
  });

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count * 2}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#8b5cf6" transparent opacity={0.08} />
    </lineSegments>
  );
}

// ==========================================
// GLOWING NEURAL NODES
// ==========================================
function GlowingNode({ position, color, size = 0.18, pulseSpeed = 1 }) {
  const meshRef = useRef();
  const glowRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      const pulse = 0.5 + Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.3;
      meshRef.current.material.opacity = pulse;
    }
    if (glowRef.current) {
      glowRef.current.intensity = 0.3 + Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.2;
    }
  });

  return (
    <group position={position}>
      {/* Outer glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * 3, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} />
      </mesh>
      {/* Core node */}
      <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.3}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[size, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      </Float>
      <pointLight color={color} intensity={0.4} distance={3} />
    </group>
  );
}

function NeuralNodes() {
  const nodes = useMemo(() => {
    const palette = ['#8b5cf6', '#3b82f6', '#06b6d4', '#ec4899', '#10b981', '#f59e0b'];
    return Array.from({ length: 20 }, (_, i) => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 18
      ),
      color: palette[i % palette.length],
      pulseSpeed: 0.5 + Math.random(),
    }));
  }, []);

  return nodes.map((node, i) => (
    <GlowingNode key={i} {...node} />
  ));
}

// ==========================================
// ENERGY RINGS
// ==========================================
function EnergyRing({ radius = 4, color = '#8b5cf6', speed = 0.1, tilt = 0 }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.PI / 2 + tilt;
      meshRef.current.rotation.z = state.clock.elapsedTime * speed;
    }
  });

  return (
    <mesh ref={meshRef}>
      <ringGeometry args={[radius - 0.3, radius, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.12} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ==========================================
// FLOATING GEOMETRIC SHAPES
// ==========================================
function FloatingIcosahedron() {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <Float speed={0.8} floatIntensity={1.5} rotationIntensity={0.5}>
      <mesh ref={meshRef} position={[7, -3, -8]}>
        <icosahedronGeometry args={[0.6, 0]} />
        <MeshDistortMaterial
          color="#8b5cf6"
          transparent
          opacity={0.25}
          wireframe
          distort={0.2}
          speed={1.5}
        />
      </mesh>
    </Float>
  );
}

function FloatingTorus() {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.15;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.25;
    }
  });

  return (
    <Float speed={1} floatIntensity={1} rotationIntensity={0.3}>
      <mesh ref={meshRef} position={[-6, 2, -10]}>
        <torusGeometry args={[0.8, 0.15, 16, 32]} />
        <MeshDistortMaterial
          color="#06b6d4"
          transparent
          opacity={0.2}
          wireframe
          distort={0.3}
          speed={2}
        />
      </mesh>
    </Float>
  );
}

function FloatingOctahedron() {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.18;
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.12;
    }
  });

  return (
    <Float speed={0.6} floatIntensity={2} rotationIntensity={0.4}>
      <mesh ref={meshRef} position={[0, 6, -12]}>
        <octahedronGeometry args={[0.5, 0]} />
        <MeshDistortMaterial
          color="#ec4899"
          transparent
          opacity={0.2}
          wireframe
          distort={0.25}
          speed={1.8}
        />
      </mesh>
    </Float>
  );
}

// ==========================================
// SCANNING ENERGY WAVE
// ==========================================
function EnergyWave() {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      meshRef.current.position.y = Math.sin(time * 0.3) * 6;
      meshRef.current.material.opacity = 0.08 + Math.sin(time * 0.3) * 0.04;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[0, 0, 0]}>
      <planeGeometry args={[20, 0.1]} />
      <meshBasicMaterial
        color="#8b5cf6"
        transparent
        opacity={0.1}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ==========================================
// STAR FIELD BACKGROUND
// ==========================================
function StarField({ count = 800 }) {
  const meshRef = useRef();

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60 - 20;
    }
    return pos;
  }, [count]);

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#8b5cf6"
        transparent
        opacity={0.3}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ==========================================
// SCENE CONTROLLER (auto-rotate + mouse)
// ==========================================
function SceneController() {
  const { camera, pointer } = useThree();

  useFrame((state) => {
    // Subtle camera drift
    const time = state.clock.elapsedTime;
    camera.position.x = Math.sin(time * 0.02) * 1;
    camera.position.y = Math.sin(time * 0.015) * 0.5 + pointer.y * 1.5;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ==========================================
// WebGL Detection
// ==========================================
function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

// ==========================================
// MAIN EXPORT
// ==========================================
export default function NeuralBackground() {
  const webglSupported = typeof document !== 'undefined' && hasWebGL();

  if (!webglSupported) {
    return (
      <div
        className="fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse at center, #0f0a1a 0%, #0a0a0f 50%, #000000 100%)',
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-0" style={{ pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 18], fov: 60 }}
        dpr={[1, 1.5]} // Limited DPR for performance
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <SceneController />

        {/* Ambient base light */}
        <ambientLight intensity={0.4} />

        {/* Star field in the far background */}
        <StarField count={800} />

        {/* Particle system - the core visual */}
        <ParticleSystem count={400} />

        {/* Neural connections between nodes */}
        <NeuralConnections />

        {/* Glowing neural nodes */}
        <NeuralNodes />

        {/* Multi-layered energy rings */}
        <EnergyRing radius={5} color="#8b5cf6" speed={0.08} tilt={0.1} />
        <EnergyRing radius={6.5} color="#06b6d4" speed={-0.06} tilt={-0.05} />
        <EnergyRing radius={3.5} color="#ec4899" speed={0.12} tilt={0.15} />

        {/* Floating geometric shapes */}
        <FloatingIcosahedron />
        <FloatingTorus />
        <FloatingOctahedron />

        {/* Scanning energy wave */}
        <EnergyWave />
      </Canvas>
    </div>
  );
}
