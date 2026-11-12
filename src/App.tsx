import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CSSProperties } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

/* =========================================================
   Pip — karakter original dari bentuk-bentuk dasar Three.js
   ========================================================= */

const C = {
  teal: '#2ec4b6',
  cream: '#f6f1e7',
  orange: '#ff9f1c',
  navy: '#1b1f3b',
  cyan: '#7df9ff',
};

type Info = [string, string]; // [nama bagian, jenis geometry]
type Vec3 = [number, number, number];

// "Pengaturan tampilan" yang dipakai semua bagian (wireframe, outline, hover)
type LookSettings = {
  wire: boolean;
  outline: boolean;
  onHover: (info: Info | null) => void;
  gradientMap: THREE.Texture;
};
const Look = createContext<LookSettings>(null!);

/* ---------- Part: satu bagian badan = bentuk + cat + outline ---------- */
type PartProps = {
  make: () => THREE.BufferGeometry; // fungsi yang bikin bentuknya
  color: string;
  info: Info;
  glow?: boolean; // true = nyala sendiri, nggak kena lampu
  outline?: boolean; // garis tepi kartun
  thick?: number; // tebal outline (skala)
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3 | number;
};

const Part = forwardRef<THREE.Mesh, PartProps>(function Part(
  { make, color, info, glow = false, outline = true, thick = 1.06, ...rest },
  ref
) {
  const look = useContext(Look);
  const geo = useMemo(make, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <mesh
      ref={ref}
      geometry={geo}
      {...rest}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        look.onHover(info);
      }}
      onPointerOut={() => look.onHover(null)}
    >
      {glow ? (
        <meshBasicMaterial color={color} />
      ) : (
        <meshToonMaterial
          color={color}
          gradientMap={look.gradientMap}
          wireframe={look.wire}
        />
      )}

      {/* trik outline: salinan bentuk yang sedikit lebih besar, warna gelap, sisi dalamnya aja */}
      {outline && look.outline && (
        <mesh geometry={geo} scale={thick} raycast={() => null}>
          <meshBasicMaterial color="#05070f" side={THREE.BackSide} />
        </mesh>
      )}
    </mesh>
  );
});

/* ---------- Arm: lengan + tangan, pivot di bahu ---------- */
const Arm = forwardRef<THREE.Group, { side: number }>(function Arm(
  { side },
  ref
) {
  return (
    <group
      ref={ref}
      position={[0.62 * side, 0.32, 0]}
      rotation={[0, 0, 0.18 * side]}
    >
      <Part
        make={() => new THREE.CapsuleGeometry(0.11, 0.32, 6, 16)}
        color={C.teal}
        info={['lengan', 'CapsuleGeometry']}
        thick={1.1}
        position={[0, -0.27, 0]}
      />
      <Part
        make={() => new THREE.SphereGeometry(0.14, 20, 16)}
        color={C.cream}
        info={['tangan', 'SphereGeometry']}
        thick={1.1}
        position={[0, -0.55, 0]}
      />
    </group>
  );
});

/* ---------- Pip ---------- */
function Pip({ waveCount, onWave }: { waveCount: number; onWave: () => void }) {
  const root = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const armL = useRef<THREE.Group>(null!);
  const armR = useRef<THREE.Group>(null!);
  const eyeL = useRef<THREE.Mesh>(null!);
  const eyeR = useRef<THREE.Mesh>(null!);
  const antennaTip = useRef<THREE.Mesh>(null!);
  const flame = useRef<THREE.Mesh>(null!);
  const flameMat = useRef<THREE.MeshBasicMaterial>(null!);
  const dataCube = useRef<THREE.Mesh>(null!);
  const shadow = useRef<THREE.Mesh>(null!);

  const lookAt = useRef(new THREE.Vector2());
  const waveUntil = useRef(0);
  const wantWave = useRef(false);
  const nextBlink = useRef(2.5);

  useEffect(() => {
    if (waveCount > 0) wantWave.current = true;
  }, [waveCount]);

  // jalan tiap frame (±60x per detik)
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (wantWave.current) {
      waveUntil.current = t + 2;
      wantWave.current = false;
    }
    const waving = t < waveUntil.current;

    // melayang naik-turun
    const bob = Math.sin(t * 1.6) * 0.15;
    root.current.position.y = bob;
    shadow.current.scale.setScalar(1 - Math.sin(t * 1.6) * 0.08);

    // kepala nengok ke arah mouse
    lookAt.current.lerp(state.pointer, 0.06);
    head.current.rotation.y = lookAt.current.x * 0.5;
    head.current.rotation.x = -lookAt.current.y * 0.25;

    // tangan ngayun, tangan kanan melambai kalau lagi wave
    armL.current.rotation.z = -0.18 - Math.sin(t * 1.6) * 0.08;
    const target = waving
      ? 2.5 + Math.sin(t * 14) * 0.35
      : 0.18 + Math.sin(t * 1.6) * 0.08;
    armR.current.rotation.z +=
      (target - armR.current.rotation.z) * (waving ? 0.25 : 0.12);

    // kedip
    let eyeScale = 1;
    if (t > nextBlink.current) {
      const k = (t - nextBlink.current) / 0.14;
      if (k < 1) eyeScale = 1 - Math.sin(k * Math.PI) * 0.9;
      else nextBlink.current = t + 2.5 + Math.random() * 2.5;
    }
    eyeL.current.scale.y = eyeScale;
    eyeR.current.scale.y = eyeScale;

    // antena berdenyut, api jet berkedip
    antennaTip.current.scale.setScalar(1 + Math.sin(t * 4) * 0.15);
    flameMat.current.opacity =
      0.22 + Math.sin(t * 18) * 0.05 + Math.random() * 0.04;
    flame.current.scale.y = 1 + Math.sin(t * 9) * 0.08;

    // kubus data muter ngelilingin Pip
    dataCube.current.position.set(
      Math.cos(t * 0.9) * 1.5,
      0.7 + Math.sin(t * 1.8) * 0.2 + bob,
      Math.sin(t * 0.9) * 1.5
    );
    dataCube.current.rotation.set(t * 1.2, t * 0.8, 0);
  });

  return (
    <>
      <group
        ref={root}
        onClick={(e) => {
          e.stopPropagation();
          onWave();
        }}
      >
        {/* badan */}
        <Part
          make={() => new THREE.CapsuleGeometry(0.55, 0.45, 8, 24)}
          color={C.teal}
          info={['badan', 'CapsuleGeometry']}
        />
        <Part
          make={() => new THREE.TorusGeometry(0.575, 0.07, 12, 48)}
          color={C.orange}
          info={['sabuk', 'TorusGeometry']}
          thick={1.12}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, -0.08, 0]}
        />
        <Part
          make={() => new THREE.SphereGeometry(0.1, 20, 16)}
          color={C.orange}
          info={['inti energi', 'SphereGeometry']}
          glow
          outline={false}
          position={[0, 0.2, 0.54]}
        />

        {/* kepala */}
        <group ref={head} position={[0, 1.2, 0]}>
          <Part
            make={() => new THREE.SphereGeometry(0.62, 32, 24)}
            color={C.cream}
            info={['kepala', 'SphereGeometry']}
            scale={[1.12, 0.92, 1]}
          />
          <Part
            make={() => new THREE.CapsuleGeometry(0.22, 0.6, 8, 20)}
            color={C.navy}
            info={['visor', 'CapsuleGeometry']}
            thick={1.08}
            rotation={[0, 0, Math.PI / 2]}
            scale={[1, 1, 0.55]}
            position={[0, 0.02, 0.57]}
          />
          <Part
            ref={eyeL}
            make={() => new THREE.CapsuleGeometry(0.05, 0.07, 6, 12)}
            color={C.cyan}
            info={['mata', 'CapsuleGeometry']}
            glow
            outline={false}
            position={[-0.17, 0.03, 0.69]}
          />
          <Part
            ref={eyeR}
            make={() => new THREE.CapsuleGeometry(0.05, 0.07, 6, 12)}
            color={C.cyan}
            info={['mata', 'CapsuleGeometry']}
            glow
            outline={false}
            position={[0.17, 0.03, 0.69]}
          />
          {[-0.69, 0.69].map((x) => (
            <Part
              key={x}
              make={() => new THREE.CylinderGeometry(0.13, 0.13, 0.14, 24)}
              color={C.orange}
              info={['telinga', 'CylinderGeometry']}
              thick={1.12}
              rotation={[0, 0, Math.PI / 2]}
              position={[x, 0, 0]}
            />
          ))}
          <Part
            make={() => new THREE.CylinderGeometry(0.025, 0.025, 0.42, 10)}
            color={C.navy}
            info={['antena', 'CylinderGeometry']}
            thick={1.4}
            position={[0, 0.75, 0]}
          />
          <Part
            ref={antennaTip}
            make={() => new THREE.SphereGeometry(0.085, 20, 16)}
            color={C.orange}
            info={['ujung antena', 'SphereGeometry']}
            glow
            outline={false}
            position={[0, 0.98, 0]}
          />
        </group>

        {/* tangan */}
        <Arm ref={armL} side={-1} />
        <Arm ref={armR} side={1} />

        {/* jet */}
        <Part
          make={() => new THREE.TorusGeometry(0.32, 0.05, 10, 40)}
          color={C.cyan}
          info={['cincin jet', 'TorusGeometry']}
          glow
          outline={false}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, -0.92, 0]}
        />
        <mesh
          ref={flame}
          rotation={[Math.PI, 0, 0]}
          position={[0, -1.3, 0]}
          raycast={() => null}
        >
          <coneGeometry args={[0.3, 0.75, 24, 1, true]} />
          <meshBasicMaterial
            ref={flameMat}
            color={C.cyan}
            transparent
            opacity={0.28}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* kubus data */}
      <Part
        ref={dataCube}
        make={() => new THREE.BoxGeometry(0.26, 0.26, 0.26)}
        color={C.orange}
        info={['kubus data', 'BoxGeometry']}
        thick={1.12}
      />

      {/* bayangan bercahaya di lantai */}
      <mesh
        ref={shadow}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -2.19, 0]}
        raycast={() => null}
      >
        <circleGeometry args={[0.9, 40]} />
        <meshBasicMaterial
          color={C.cyan}
          transparent
          opacity={0.16}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

/* ---------- Dunia digital: grid, kubus wireframe, bintang ---------- */
function World() {
  const floaters = useMemo(() => {
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    return Array.from({ length: 26 }, () => {
      const angle = rand(0, Math.PI * 2);
      const radius = rand(4.5, 13);
      return {
        size: rand(0.25, 0.9),
        pos: [
          Math.cos(angle) * radius,
          rand(-1.5, 5),
          Math.sin(angle) * radius,
        ] as Vec3,
        spin: rand(0.1, 0.4) * (Math.random() < 0.5 ? -1 : 1),
        phase: rand(0, Math.PI * 2),
        color: Math.random() < 0.75 ? C.cyan : C.orange,
      };
    });
  }, []);
  const lines = useRef<THREE.LineSegments[]>([]);
  const grid = useRef<THREE.GridHelper>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    lines.current.forEach((line, i) => {
      const f = floaters[i];
      line.rotation.x += f.spin * 0.3;
      line.rotation.y += f.spin * 0.012;
      line.position.y = f.pos[1] + Math.sin(t * 0.6 + f.phase) * 0.25;
    });
    grid.current.position.z = (t * 0.4) % 1; // lantai kayak jalan terus
  });

  return (
    <>
      <gridHelper
        ref={grid}
        args={[48, 48, C.teal, '#1d3b5c']}
        position={[0, -2.2, 0]}
      />
      {floaters.map((f, i) => (
        <lineSegments
          key={i}
          position={f.pos}
          ref={(el) => {
            if (el) lines.current[i] = el;
          }}
        >
          <edgesGeometry
            args={[new THREE.BoxGeometry(f.size, f.size, f.size)]}
          />
          <lineBasicMaterial color={f.color} transparent opacity={0.55} />
        </lineSegments>
      ))}
      <Stars radius={30} depth={15} count={600} factor={2} fade />
    </>
  );
}

/* ---------- App ---------- */
export default function App() {
  const [hover, setHover] = useState<Info | null>(null);
  const [wire, setWire] = useState(false);
  const [outline, setOutline] = useState(true);
  const [waveCount, setWaveCount] = useState(0);

  // gradient 3 tingkat buat efek kartun (toon)
  const gradientMap = useMemo(() => {
    const tex = new THREE.DataTexture(
      new Uint8Array([90, 170, 255]),
      3,
      1,
      THREE.RedFormat
    );
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, []);

  const onHover = (info: Info | null) => {
    setHover(info);
    document.body.style.cursor = info ? 'pointer' : 'auto';
  };
  const wave = () => setWaveCount((c) => c + 1);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0b1026',
        color: '#e8f1ff',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <Canvas camera={{ position: [3.2, 1.6, 6.2], fov: 40 }}>
        <color attach="background" args={['#0b1026']} />
        <fog attach="fog" args={['#0b1026', 9, 24]} />

        <hemisphereLight args={['#bde0ff', '#1b1f3b', 1.3]} />
        <directionalLight position={[3, 5, 4]} intensity={2.2} />
        <pointLight
          position={[-2.5, 2, -3]}
          intensity={10}
          distance={12}
          color={C.orange}
        />

        <Look.Provider value={{ wire, outline, onHover, gradientMap }}>
          <Pip waveCount={waveCount} onWave={wave} />
        </Look.Provider>
        <World />

        <OrbitControls
          target={[0, 0.35, 0]}
          enablePan={false}
          minDistance={3.5}
          maxDistance={12}
          maxPolarAngle={Math.PI / 1.9}
        />
      </Canvas>

      {/* panel UI (HTML biasa, di luar Canvas) */}
      <div style={card}>
        <h1 style={{ margin: 0, fontSize: 24 }}>
          Pip <span style={{ color: C.cyan }}>·</span> v1.0
        </h1>
        <p
          style={{
            margin: '6px 0 12px',
            fontSize: 14,
            lineHeight: 1.5,
            color: '#b9c7e6',
          }}
        >
          Karakter original dari bentuk dasar Three.js. Hover ke badannya buat
          lihat tiap bagian.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button style={btn(false)} onClick={wave}>
            👋 Wave
          </button>
          <button
            style={btn(wire)}
            aria-pressed={wire}
            onClick={() => setWire((v) => !v)}
          >
            Wireframe
          </button>
          <button
            style={btn(outline)}
            aria-pressed={outline}
            onClick={() => setOutline((v) => !v)}
          >
            Outline
          </button>
        </div>
      </div>

      <div style={tipBox}>
        {hover ? (
          <>
            {hover[0]} · <b style={{ color: C.orange }}>{hover[1]}</b>
          </>
        ) : (
          'drag buat muter · scroll buat zoom · hover ke Pip'
        )}
      </div>
    </div>
  );
}

/* ---------- style UI ---------- */
const card: CSSProperties = {
  position: 'absolute',
  top: 20,
  left: 20,
  maxWidth: 300,
  padding: '16px 18px',
  background: 'rgba(11, 16, 38, .75)',
  border: '1px solid rgba(125, 249, 255, .25)',
  borderRadius: 14,
};
const btn = (active: boolean): CSSProperties => ({
  font: '600 13px monospace',
  minHeight: 40,
  padding: '0 14px',
  borderRadius: 10,
  cursor: 'pointer',
  border: `1px solid ${C.teal}`,
  background: active ? C.teal : 'rgba(46, 196, 182, .12)',
  color: active ? '#0b1026' : '#e8f1ff',
});
const tipBox: CSSProperties = {
  position: 'absolute',
  bottom: 18,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '6px 14px',
  borderRadius: 999,
  background: 'rgba(11, 16, 38, .7)',
  border: '1px solid rgba(125, 249, 255, .3)',
  font: '12px monospace',
  color: '#cfe0ff',
  whiteSpace: 'nowrap',
};
