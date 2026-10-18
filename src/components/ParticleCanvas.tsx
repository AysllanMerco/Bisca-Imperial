import React, {
  useEffect,
  useImperativeHandle,
  useRef,
  forwardRef,
} from 'react';
import { prefersReducedMotion } from '../utils/motionPreferences';

export interface ParticleBurstOptions {
  x?: number;
  y?: number;
  count?: number;
  palette?: 'gold' | 'emerald' | 'crimson' | 'royal';
  includeSuits?: boolean;
}

export interface ShockwaveOptions {
  x?: number;
  y?: number;
  color?: string;
  maxRadius?: number;
  rings?: number;
}

export interface ParticleCanvasHandle {
  emitBurst: (options?: ParticleBurstOptions) => void;
  emitShockwave: (options?: ShockwaveOptions) => void;
  emitTrumpSlash: (x?: number, y?: number) => void;
  triggerCelebration: (intensity?: 'normal' | 'grand') => void;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  rotation: number;
  vRot: number;
  shape: 'diamond' | 'circle' | 'spark' | 'coin' | 'suit';
  suitChar: string;
}

interface ShockwaveRing {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
  lineWidth: number;
}

interface SlashEffect {
  active: boolean;
  x: number;
  y: number;
  angle: number;
  length: number;
  life: number;
  maxLife: number;
  color: string;
}

interface DustMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
}

const POOL_SIZE = 280;
const RING_POOL_SIZE = 20;
const SLASH_POOL_SIZE = 8;
const DUST_COUNT = 32;

const SUIT_CHARS = ['♠', '♥', '♦', '♣'];

const PALETTES: Record<'gold' | 'emerald' | 'crimson' | 'royal', string[]> = {
  gold: ['#FBBF24', '#F59E0B', '#FEF08A', '#D97706', '#FFFBEB'],
  emerald: ['#34D399', '#10B981', '#A7F3D0', '#FBBF24', '#6EE7B7'],
  crimson: ['#F87171', '#EF4444', '#FCA5A5', '#FBBF24', '#DC2626'],
  royal: ['#FBBF24', '#34D399', '#F87171', '#FEF08A', '#60A5FA'],
};

export const ParticleCanvas = forwardRef<ParticleCanvasHandle, object>(
  function ParticleCanvas(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poolRef = useRef<Particle[]>([]);
  const ringPoolRef = useRef<ShockwaveRing[]>([]);
  const slashPoolRef = useRef<SlashEffect[]>([]);
  const celebrationTimersRef = useRef<number[]>([]);

  // Initialize fixed object pools once
  if (poolRef.current.length === 0) {
    for (let i = 0; i < POOL_SIZE; i++) {
      poolRef.current.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 4,
        alpha: 1,
        life: 0,
        maxLife: 1,
        color: '#FBBF24',
        rotation: 0,
        vRot: 0,
        shape: 'diamond',
        suitChar: '♠',
      });
    }
  }

  if (ringPoolRef.current.length === 0) {
    for (let i = 0; i < RING_POOL_SIZE; i++) {
      ringPoolRef.current.push({
        active: false,
        x: 0,
        y: 0,
        radius: 10,
        maxRadius: 200,
        life: 0,
        maxLife: 0.6,
        color: '#FBBF24',
        lineWidth: 4,
      });
    }
  }

  if (slashPoolRef.current.length === 0) {
    for (let i = 0; i < SLASH_POOL_SIZE; i++) {
      slashPoolRef.current.push({
        active: false,
        x: 0,
        y: 0,
        angle: -0.6,
        length: 260,
        life: 0,
        maxLife: 0.42,
        color: '#FBBF24',
      });
    }
  }

  const spawnBurstInternal = (options?: ParticleBurstOptions) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = options?.x ?? canvas.width * 0.5;
    const cy = options?.y ?? canvas.height * 0.48;
    const count = options?.count ?? 45;
    const colors = PALETTES[options?.palette ?? 'gold'];
    const includeSuits = options?.includeSuits ?? true;

    let spawned = 0;
    const pool = poolRef.current;
    for (let i = 0; i < pool.length && spawned < count; i++) {
      const p = pool[i];
      if (!p.active) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 90 + Math.random() * 340;
        p.active = true;
        p.x = cx + (Math.random() - 0.5) * 28;
        p.y = cy + (Math.random() - 0.5) * 28;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 95;
        p.size = 4 + Math.random() * 6.5;
        p.life = 0;
        p.maxLife = 0.65 + Math.random() * 0.65;
        p.alpha = 1;
        p.color = colors[Math.floor(Math.random() * colors.length)];
        p.rotation = Math.random() * Math.PI * 2;
        p.vRot = (Math.random() - 0.5) * 10;

        const r = Math.random();
        if (includeSuits && r < 0.2) {
          p.shape = 'suit';
          p.suitChar =
            SUIT_CHARS[Math.floor(Math.random() * SUIT_CHARS.length)];
          p.size = 13 + Math.random() * 7;
        } else if (r < 0.48) {
          p.shape = 'coin';
        } else if (r < 0.75) {
          p.shape = 'diamond';
        } else {
          p.shape = 'spark';
        }
        spawned++;
      }
    }
  };

  const spawnShockwaveInternal = (options?: ShockwaveOptions) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = options?.x ?? canvas.width * 0.5;
    const cy = options?.y ?? canvas.height * 0.48;
    const color = options?.color ?? '#FBBF24';
    const maxRadius = options?.maxRadius ?? 220;
    const rings = options?.rings ?? 2;

    let spawned = 0;
    const pool = ringPoolRef.current;
    for (let i = 0; i < pool.length && spawned < rings; i++) {
      const ring = pool[i];
      if (!ring.active) {
        ring.active = true;
        ring.x = cx;
        ring.y = cy;
        ring.radius = 16 + spawned * 18;
        ring.maxRadius = maxRadius - spawned * 35;
        ring.life = 0;
        ring.maxLife = 0.52 + spawned * 0.12;
        ring.color = color;
        ring.lineWidth = 4.5 - spawned * 1.2;
        spawned++;
      }
    }
  };

  const spawnTrumpSlashInternal = (x?: number, y?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = x ?? canvas.width * 0.5;
    const cy = y ?? canvas.height * 0.48;

    const pool = slashPoolRef.current;
    // Primary slash + cross slash
    const angles = [-0.55, 0.45];
    let spawned = 0;
    for (let i = 0; i < pool.length && spawned < 2; i++) {
      const s = pool[i];
      if (!s.active) {
        s.active = true;
        s.x = cx;
        s.y = cy;
        s.angle = angles[spawned];
        s.length = 290 - spawned * 50;
        s.life = 0;
        s.maxLife = 0.42;
        s.color = spawned === 0 ? '#FEF08A' : '#F59E0B';
        spawned++;
      }
    }

    spawnShockwaveInternal({
      x: cx,
      y: cy,
      color: '#F59E0B',
      maxRadius: 210,
      rings: 2,
    });
    spawnBurstInternal({
      x: cx,
      y: cy,
      count: 42,
      palette: 'gold',
      includeSuits: true,
    });
  };

  useImperativeHandle(ref, () => ({
    emitBurst(options?: ParticleBurstOptions) {
      if (prefersReducedMotion()) return;
      spawnBurstInternal(options);
    },
    emitShockwave(options?: ShockwaveOptions) {
      if (prefersReducedMotion()) return;
      spawnShockwaveInternal(options);
    },
    emitTrumpSlash(x?: number, y?: number) {
      if (prefersReducedMotion()) return;
      spawnTrumpSlashInternal(x, y);
    },
    triggerCelebration(intensity: 'normal' | 'grand' = 'normal') {
      if (prefersReducedMotion()) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Clear previous celebration timers
      celebrationTimersRef.current.forEach((id) => window.clearTimeout(id));
      celebrationTimersRef.current = [];

      const waves = intensity === 'grand' ? 7 : 4;
      for (let w = 0; w < waves; w++) {
        const timerId = window.setTimeout(() => {
          const rx = canvas.width * (0.2 + Math.random() * 0.6);
          const ry = canvas.height * (0.2 + Math.random() * 0.45);
          spawnShockwaveInternal({
            x: rx,
            y: ry,
            color: w % 2 === 0 ? '#FBBF24' : '#34D399',
            maxRadius: 240,
            rings: 2,
          });
          spawnBurstInternal({
            x: rx,
            y: ry,
            count: intensity === 'grand' ? 68 : 48,
            palette: 'royal',
            includeSuits: true,
          });
        }, w * 280);
        celebrationTimersRef.current.push(timerId);
      }
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Movimento reduzido: mantém apenas o redimensionamento do canvas.
    // As poeiras douradas ambientais e todos os efeitos são desligados para
    // respeitar a preferência de acessibilidade do sistema.
    if (prefersReducedMotion()) {
      return () => window.removeEventListener('resize', handleResize);
    }

    // Ambient tavern gold dust motes
    const motes: DustMote[] = Array.from({ length: DUST_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 12,
      vy: -4 - Math.random() * 10,
      radius: 1 + Math.random() * 1.8,
      alpha: 0.08 + Math.random() * 0.18,
      phase: Math.random() * Math.PI * 2,
    }));

    let lastTime = performance.now();
    let rafId = 0;
    let ambientAccumulator = 0;

    // True while any burst/ring/slash is playing. The ambient dust layer on its
    // own is slow and decorative, so it can be sampled at ~30fps; its motion is
    // time-based, so the rendered result is identical while phones do half the
    // full-screen canvas work.
    const hasActiveEffects = () => {
      const pool = poolRef.current;
      for (let i = 0; i < pool.length; i++) if (pool[i].active) return true;
      const rings = ringPoolRef.current;
      for (let i = 0; i < rings.length; i++) if (rings[i].active) return true;
      const slashes = slashPoolRef.current;
      for (let i = 0; i < slashes.length; i++) if (slashes[i].active) return true;
      return false;
    };

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(rawDt, 0.05); // Clamped frame delta time
      lastTime = now;

      if (hasActiveEffects()) {
        ambientAccumulator = 0;
      } else {
        ambientAccumulator += rawDt;
        if (ambientAccumulator < 1 / 30) {
          rafId = requestAnimationFrame(tick);
          return;
        }
        ambientAccumulator = 0;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Update & render subtle warm tavern dust motes
      ctx.fillStyle = '#FDE68A';
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.phase += dt * 1.4;
        m.x += (m.vx + Math.sin(m.phase) * 5) * dt;
        m.y += m.vy * dt;

        if (m.y < -10) {
          m.y = canvas.height + 10;
          m.x = Math.random() * canvas.width;
        }
        if (m.x < -10) m.x = canvas.width + 10;
        if (m.x > canvas.width + 10) m.x = -10;

        ctx.globalAlpha = m.alpha * (0.7 + 0.3 * Math.sin(m.phase));
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 2. Update & render Shockwave Rings
      const rings = ringPoolRef.current;
      for (let i = 0; i < rings.length; i++) {
        const r = rings[i];
        if (!r.active) continue;
        r.life += dt;
        if (r.life >= r.maxLife) {
          r.active = false;
          continue;
        }
        const t = r.life / r.maxLife;
        const easeOut = 1 - Math.pow(1 - t, 3);
        const currentRadius = r.radius + (r.maxRadius - r.radius) * easeOut;

        ctx.save();
        ctx.globalAlpha = Math.max(0, (1 - t) * 0.85);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = Math.max(0.5, r.lineWidth * (1 - t));
        ctx.beginPath();
        ctx.arc(r.x, r.y, currentRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Update & render Trump Slash Blade Arcs
      const slashes = slashPoolRef.current;
      for (let i = 0; i < slashes.length; i++) {
        const s = slashes[i];
        if (!s.active) continue;
        s.life += dt;
        if (s.life >= s.maxLife) {
          s.active = false;
          continue;
        }
        const t = s.life / s.maxLife;
        const alpha = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
        const currentLen = s.length * Math.min(1, t * 2.5);

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);
        ctx.globalAlpha = Math.max(0, alpha);

        // Glowing outer blade
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(-currentLen * 0.5, 0);
        ctx.quadraticCurveTo(0, -14 * (1 - t), currentLen * 0.5, 0);
        ctx.quadraticCurveTo(0, 14 * (1 - t), -currentLen * 0.5, 0);
        ctx.closePath();
        ctx.fill();

        // Bright white-gold core
        ctx.fillStyle = '#FEF9C3';
        ctx.beginPath();
        ctx.moveTo(-currentLen * 0.42, 0);
        ctx.quadraticCurveTo(0, -5 * (1 - t), currentLen * 0.42, 0);
        ctx.quadraticCurveTo(0, 5 * (1 - t), -currentLen * 0.42, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      // 4. Update & render Pooled Burst Particles
      const pool = poolRef.current;
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (!p.active) continue;

        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }

        const progress = p.life / p.maxLife;
        p.vy += 340 * dt; // Gravity
        p.vx *= Math.pow(0.96, dt * 60);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.vRot * dt;
        p.alpha = 1 - progress * progress;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        if (p.shape === 'suit') {
          ctx.font = `bold ${Math.round(p.size)}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.suitChar, 0, 0);
        } else if (p.shape === 'coin') {
          const scaleX = Math.max(0.25, Math.abs(Math.cos(p.rotation * 2)));
          ctx.scale(scaleX, 1);
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.85, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FEF08A';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (p.shape === 'diamond') {
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.75, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size * 0.75, 0);
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'spark') {
          ctx.fillRect(-p.size * 1.3, -1.3, p.size * 2.6, 2.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.65, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      celebrationTimersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-40"
      aria-hidden="true"
    />
  );
});
