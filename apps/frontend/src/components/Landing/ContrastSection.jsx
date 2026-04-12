import { motion, useMotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ChaosPackageIcon = () => (
  <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 opacity-30">
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

function FloatingBox({ mouseX, mouseY, containerRef }) {
  const [pos, setPos] = useState({ 
    x: Math.random() * 100, 
    y: Math.random() * 100,
    vx: (Math.random() - 0.5) * 0.15,
    vy: (Math.random() - 0.5) * 0.15 
  });

  useEffect(() => {
    let frame;
    const MAX_SPEED = 0.35;
    const MIN_SPEED = 0.05;

    const update = () => {
      setPos(prev => {
        let nvx = prev.vx;
        let nvy = prev.vy;

        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const mX = ((mouseX.get() - rect.left) / rect.width) * 100;
          const mY = ((mouseY.get() - rect.top) / rect.height) * 100;

          const dx = prev.x - mX;
          const dy = prev.y - mY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 18) {
            const force = (18 - dist) * 0.02;
            nvx += (dx / dist) * force;
            nvy += (dy / dist) * force;
          }
        }

        const currentSpeed = Math.sqrt(nvx * nvx + nvy * nvy);
        if (currentSpeed > MAX_SPEED) {
          nvx = (nvx / currentSpeed) * MAX_SPEED;
          nvy = (nvy / currentSpeed) * MAX_SPEED;
        } else if (currentSpeed < MIN_SPEED) {
          const angle = Math.atan2(nvy, nvx);
          nvx = Math.cos(angle) * MIN_SPEED;
          nvy = Math.sin(angle) * MIN_SPEED;
        }

        let nx = prev.x + nvx;
        let ny = prev.y + nvy;

        if (nx > 110) nx = -10; if (nx < -10) nx = 110;
        if (ny > 110) ny = -10; if (ny < -10) ny = 110;

        return { x: nx, y: ny, vx: nvx, vy: nvy };
      });
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [mouseX, mouseY]);

  return (
    <motion.div 
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, x: "-50%", y: "-50%" }}
      className="absolute pointer-events-none will-change-transform"
    >
      <ChaosPackageIcon />
    </motion.div>
  );
}

export default function ContrastSection() {
  const containerRef = useRef(null);
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  const handleMouseMove = (e) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  };

  return (
    <section className="py-24 bg-white overflow-hidden font-sans">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-zinc-950 tracking-tight mb-4 text-balance">
            El cambio es <span className="text-brand-500">radical</span>
          </h2>
          <p className="text-zinc-500 font-bold text-lg">De la pesadilla logística al control absoluto.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          <div 
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { mouseX.set(-1000); mouseY.set(-1000); }}
            className="relative bg-zinc-50 rounded-[2.5rem] p-8 md:p-12 overflow-hidden border border-zinc-200 min-h-[550px] flex flex-col"
          >
            <div className="relative z-30 pointer-events-none">
              <span className="inline-block px-4 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase tracking-wider mb-4">Sin EasyTrack</span>
              <h3 className="text-3xl font-black text-zinc-950 mb-6 leading-tight">El caos que te quita <br/>el sueño (y el dinero)</h3>
            </div>
              
            <div className="absolute inset-0 z-10 pointer-events-none">
              {[...Array(15)].map((_, i) => (
                <FloatingBox key={i} mouseX={mouseX} mouseY={mouseY} containerRef={containerRef} />
              ))}
            </div>

            <div className="mt-auto relative z-30 pointer-events-none">
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-zinc-600 font-bold leading-tight"><div className="mt-0.5 shrink-0"><IconX /></div> Clientes esperando minutos en mostrador</li>
                <li className="flex items-start gap-3 text-zinc-600 font-bold leading-tight"><div className="mt-0.5 shrink-0"><IconX /></div> Cajas perdidas bajo pilas de otras cajas</li>
                <li className="flex items-start gap-3 text-zinc-600 font-bold leading-tight"><div className="mt-0.5 shrink-0"><IconX /></div> Estrés constante del personal</li>
              </ul>
            </div>
          </div>

          <div className="relative bg-zinc-950 rounded-[2.5rem] p-8 md:p-12 overflow-hidden shadow-2xl flex flex-col">
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="relative z-10">
              <span className="inline-block px-4 py-1 bg-brand-500/20 text-brand-400 rounded-full text-[10px] font-black uppercase tracking-wider mb-4">Con EasyTrack</span>
              <h3 className="text-3xl font-black text-white mb-6 leading-tight">Orden quirúrgico <br/>y paz mental</h3>

              <div className="relative h-64 grid grid-cols-4 gap-4 items-center content-center p-6 bg-zinc-900/40 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(20, 184, 166, 0.15)", borderColor: "#14b8a6" }}
                    className="h-10 md:h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-[10px] font-black text-zinc-600 transition-colors"
                  >
                    {String.fromCharCode(65 + Math.floor(i/4))}{(i%4)+1}
                  </motion.div>
                ))}
                <motion.div 
                  animate={{ y: [-120, 120] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent shadow-[0_0_20px_rgba(20,184,166,0.8)] z-20 will-change-transform"
                />
              </div>

              <ul className="space-y-4 mt-10">
                <li className="flex items-start gap-3 text-zinc-300 font-bold leading-tight"><div className="mt-0.5 shrink-0"><IconCheck /></div> Localización instantánea por estante</li>
                <li className="flex items-start gap-3 text-zinc-300 font-bold leading-tight"><div className="mt-0.5 shrink-0"><IconCheck /></div> 90% menos de tiempo de entrega</li>
                <li className="flex items-start gap-3 text-zinc-300 font-bold leading-tight"><div className="mt-0.5 shrink-0"><IconCheck /></div> Personal chill y clientes felices</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}