"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView, useMotionValue, useTransform, useScroll } from "framer-motion";
import {
  Check,
  Users,
  Lock,
  Cpu,
  Database,
  GitMerge,
  CheckCircle,
  Volume2,
  Layers,
  Play,
  Pause,
  ArrowRight,
  ShieldCheck,
  Zap,
  ChevronRight,
  Activity,
  FileSpreadsheet,
  Upload,
  Download,
  Sparkles,
  Award,
  RefreshCw,
  GitBranch,
  FileText,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

// ----------------------------------------------------------------------
// Premium spring-motion transitions
// ----------------------------------------------------------------------
const luxurySpring = { type: "spring", stiffness: 100, damping: 14 };
const premiumEase = [0.16, 1, 0.3, 1];

// Dark Blue Theme Constants
const DB_PRIMARY = "#1E3A8A";    // blue-900
const DB_ACCENT = "#3B82F6";     // blue-500
const DB_LIGHT = "#60A5FA";      // blue-400
const DB_DEEP = "#1E40AF";       // blue-800

// ----------------------------------------------------------------------
// Main Exported Component
// ----------------------------------------------------------------------
export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: mounted ? pageRef : null,
    offset: ["start start", "end end"]
  });

  useEffect(() => {
    setMounted(true);
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || (isAuthenticated && mounted)) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center relative overflow-hidden">
        {/* Ambient blurs */}
        <div className="absolute w-[500px] h-[500px] bg-blue-500/[0.06] rounded-full blur-[180px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute w-[300px] h-[300px] bg-blue-400/[0.04] rounded-full blur-[120px] top-[40%] left-[60%] -translate-x-1/2 -translate-y-1/2" />

        <div className="flex flex-col items-center gap-8 relative z-10">
          {/* Logo mark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: premiumEase }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-800 to-blue-500 flex items-center justify-center p-[1.5px] shadow-[0_0_40px_rgba(30,58,138,0.2)]"
          >
            <div className="w-full h-full bg-white rounded-[15px] flex items-center justify-center">
              <span className="text-blue-800 font-black text-xl tracking-tighter">DA</span>
            </div>
          </motion.div>

          {/* Pulse rings */}
          <div className="relative w-24 h-24">
            <motion.div
              animate={{ scale: [1, 2.2], opacity: [0.25, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
              className="absolute inset-0 border-2 border-blue-500/30 rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.8], opacity: [0.2, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 0.5 }}
              className="absolute inset-0 border border-blue-400/20 rounded-full"
            />
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="w-3 h-3 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              />
            </div>
          </div>

          {/* Loading text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: premiumEase }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-[10px] font-mono tracking-[0.3em] text-blue-700 uppercase font-bold">
              Loading
            </span>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", delay: i * 0.2 }}
                  className="w-1.5 h-1.5 rounded-full bg-blue-500"
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-[#F7F8FA] text-[#0F0F12] font-sans overflow-x-hidden selection:bg-blue-700 selection:text-white antialiased relative"
    >
      <ParticleWaveCanvas />
      <GlowingScannerLine />

      {/* Dark Blue ambient blurs */}
      <div className="absolute top-[-150px] left-1/4 w-[800px] h-[800px] bg-blue-600/[0.05] rounded-full blur-[200px] pointer-events-none -z-10" />
      <div className="absolute top-[35%] right-10 w-[700px] h-[700px] bg-blue-400/[0.04] rounded-full blur-[180px] pointer-events-none -z-10" />
      <div className="absolute bottom-[10%] left-10 w-[800px] h-[800px] bg-blue-800/[0.04] rounded-full blur-[220px] pointer-events-none -z-10" />

      <Floating3DPrimitives scrollYProgress={scrollYProgress} />

      <Navbar />
      <Hero scrollYProgress={scrollYProgress} />
      <EfficiencyDashboard />
      <ProblemSolution />
      <CoreFeatures />
      <ConsensusCenter />
      <FinalCTA />
      <Footer />
    </div>
  );
}

// ----------------------------------------------------------------------
// Glowing Scanner Line (Dark Blue)
// ----------------------------------------------------------------------
function GlowingScannerLine() {
  return (
    <motion.div
      initial={{ top: "-10%" }}
      animate={{ top: "110%" }}
      transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
      className="fixed left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-600/45 to-transparent pointer-events-none -z-10 shadow-[0_0_18px_rgba(30,58,138,0.65)]"
    />
  );
}

// ----------------------------------------------------------------------
// 3D Particle Mesh Background (Dark Blue Theme)
// ----------------------------------------------------------------------
function ParticleWaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX - window.innerWidth / 2) * 0.08;
      mouseRef.current.targetY = (e.clientY - window.innerHeight / 2) * 0.08;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    const cols = 45;
    const rows = 35;
    const spacingX = width / (cols - 1);
    const spacingY = height / (rows - 1);
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      phase += 0.012;

      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;

      for (let r = 0; rows > r; r++) {
        for (let c = cols - 1; c >= 0; c--) {
          const waveHeight = Math.sin(c * 0.12 + phase) * Math.cos(r * 0.1 + phase) * 18;
          const x = c * spacingX + mouseRef.current.x + (r * 2.5);
          const y = r * spacingY + waveHeight + mouseRef.current.y + (c * 1.5);

          const opacityX = Math.sin((c / cols) * Math.PI);
          const opacityY = Math.sin((r / rows) * Math.PI);
          const alpha = opacityX * opacityY * 0.14;

          if (alpha > 0.01) {
            ctx.fillStyle = `rgba(30, 58, 138, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, 1.1, 0, Math.PI * 2);
            ctx.fill();

            if (r < rows - 1) {
              const nextWaveHeight = Math.sin(c * 0.12 + phase) * Math.cos((r + 1) * 0.1 + phase) * 18;
              const nextY = (r + 1) * spacingY + nextWaveHeight + mouseRef.current.y + (c * 1.5);
              ctx.strokeStyle = `rgba(59, 130, 246, ${alpha * 0.35})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x, nextY);
              ctx.stroke();
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none -z-20 opacity-80"
    />
  );
}

// ----------------------------------------------------------------------
// Floating 3D Parallax Primitives (Dark Blue)
// ----------------------------------------------------------------------
function Floating3DPrimitives({ scrollYProgress }: { scrollYProgress: any }) {
  const shapeY1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const shapeY2 = useTransform(scrollYProgress, [0, 1], [0, 250]);
  const rotation = useTransform(scrollYProgress, [0, 1], [0, 360]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden -z-10">
      <motion.div
        style={{ y: shapeY1, rotate: rotation }}
        className="absolute top-[20%] left-[6%] w-20 h-20 hidden md:flex items-center justify-center"
      >
        <div className="w-full h-full bg-gradient-to-tr from-white/40 to-blue-600/10 backdrop-blur-[6px] border border-gray-200/50 rounded-xl shadow-md [transform:rotateX(45deg)_rotateY(45deg)]" />
      </motion.div>

      <motion.div
        style={{ y: shapeY2, rotate: rotation }}
        className="absolute top-[60%] right-[8%] w-24 h-24 hidden md:flex items-center justify-center"
      >
        <div className="w-full h-full bg-gradient-to-b from-blue-400/5 via-white/50 to-blue-800/10 backdrop-blur-[6px] border border-gray-200/50 rounded-full shadow-md" />
      </motion.div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Navigation Header
// ----------------------------------------------------------------------
function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: "Problem", href: "#problem" },
    { label: "Features", href: "#features" },
    { label: "Consensus", href: "#consensus" },
    { label: "Docs", href: "/documentation" },
    { label: "Paradigm", href: "#comparison" }
  ];

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: premiumEase }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-xl py-4 border-b border-gray-200/50 shadow-[0_1px_20px_rgba(0,0,0,0.04)]"
          : "bg-transparent py-7 border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-800 to-blue-500 flex items-center justify-center p-[1px] shadow-[0_0_20px_rgba(30,58,138,0.2)] group-hover:shadow-[0_0_25px_rgba(30,58,138,0.35)] transition-shadow duration-300">
            <div className="w-full h-full bg-white rounded-[7px] flex items-center justify-center">
              <span className="text-blue-800 font-black text-sm tracking-tighter">DA</span>
            </div>
          </div>
          <span className="font-extrabold text-lg tracking-wider text-[#111115]">DATAANNOTATE</span>
          <span className="text-[9px] font-mono font-black text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded uppercase tracking-widest hidden sm:inline-block">
            v2.0
          </span>
        </Link>

        <nav className="hidden lg:flex items-center space-x-10">
          {navItems.map((item, idx) => {
            const isExternal = item.href.startsWith("/");
            const content = (
              <>
                <span className="text-[10px] font-mono text-blue-600/70 group-hover:text-blue-600 transition-colors">
                  [0{idx + 1}]
                </span>
                <span>{item.label}</span>
              </>
            );
            return isExternal ? (
              <Link
                key={idx}
                href={item.href}
                className="text-[11px] font-semibold tracking-[0.15em] text-gray-400 hover:text-[#111115] transition-colors duration-300 uppercase flex items-center gap-1.5 group"
              >
                {content}
              </Link>
            ) : (
              <a
                key={idx}
                href={item.href}
                className="text-[11px] font-semibold tracking-[0.15em] text-gray-400 hover:text-[#111115] transition-colors duration-300 uppercase flex items-center gap-1.5 group"
              >
                {content}
              </a>
            );
          })}
        </nav>

        <div>
          <Link href={isAuthenticated ? "/dashboard" : "/login"}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="relative group overflow-hidden bg-gradient-to-r from-[#1E3A8A] to-[#1E40AF] text-white hover:from-blue-700 hover:to-blue-800 px-6 py-2.5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-300 shadow-sm border border-blue-600/20"
            >
              <span>{isAuthenticated ? "Dashboard" : "Start Annotating"}</span>
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

// ----------------------------------------------------------------------
// 1. HERO SECTION — "Enterprise Data Annotation That Never Breaks"
// ----------------------------------------------------------------------
function Hero({ scrollYProgress }: { scrollYProgress: any }) {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true });
  const heroTranslateY = useTransform(scrollYProgress, [0, 0.4], [0, -60]);

  const titleWords = "Enterprise Data Annotation That Never Breaks.".split(" ");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
  };
  const itemVariants = {
    hidden: { y: 35, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 1.0, ease: premiumEase } },
  };

  return (
    <motion.section
      ref={containerRef}
      style={{ y: heroTranslateY }}
      className="min-h-screen pt-36 pb-20 flex flex-col justify-center px-6 md:px-12 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative z-10 w-full">
        {/* Left copy */}
        <div className="lg:col-span-6 space-y-8 text-left">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: premiumEase }}
            className="inline-flex items-center space-x-2.5 border border-blue-500/15 bg-blue-500/[0.04] text-blue-700 text-[10px] font-mono uppercase tracking-[0.25em] px-5 py-2 rounded-full backdrop-blur-sm shadow-[0_0_20px_rgba(59,130,246,0.06)]"
          >
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
            <span>Continuous Consensus Architecture</span>
          </motion.div>

          <motion.h1
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[0.95] text-[#111115]"
          >
            {titleWords.map((word, idx) => (
              <span key={idx} className="inline-block overflow-hidden mr-3 py-1.5">
                <motion.span variants={itemVariants} className="inline-block">
                  {word}
                </motion.span>
              </span>
            ))}
          </motion.h1>

          <p className="text-gray-500 font-medium text-base md:text-lg max-w-lg leading-relaxed">
            Eliminating bias through secure, multi-workspace isolation. Dynamically synchronize evolving schemas, resolve conflicts instantly, and build bulletproof ground-truth datasets—even while annotators are still working.
          </p>

          <div className="flex flex-wrap gap-4 pt-6">
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0_8px_30px_rgba(30,58,138,0.4)" }}
                whileTap={{ scale: 0.97 }}
                className="bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-700 hover:to-blue-800 text-white px-9 py-4 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase shadow-[0_4px_24px_rgba(30,58,138,0.3)] transition-all duration-300 border border-blue-700/30"
              >
                Start Annotating Free
              </motion.button>
            </Link>
            <Link href="/documentation">
              <motion.button
                whileHover={{ scale: 1.03, backgroundColor: "rgba(59,130,246,0.04)" }}
                whileTap={{ scale: 0.97 }}
                className="border border-gray-200 hover:border-blue-300 bg-white/60 backdrop-blur-sm text-gray-600 hover:text-blue-800 px-9 py-4 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase transition-all duration-300 shadow-sm"
              >
                Read Documentation
              </motion.button>
            </Link>
          </div>
        </div>

        {/* Right: Video */}
        <div className="lg:col-span-6 flex justify-center items-center h-[520px] relative">
          <div className="absolute w-[85%] h-[85%] bg-blue-500/[0.06] rounded-full blur-[100px] pointer-events-none" />
          <div className="relative w-[88%] h-[88%]">
            <div className="absolute inset-0 rounded-3xl border border-gray-200/40 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.12)] bg-gray-900" />
            <video src="/assets/VID_20260702_145338.mp4" autoPlay muted loop playsInline preload="auto" className="w-full h-full object-cover rounded-3xl shadow-[0_12px_50px_rgba(0,0,0,0.1)] ring-1 ring-gray-100/50 relative z-[1]" />
          </div>
        </div>
      </div>
    </motion.section>
  );
}

// ----------------------------------------------------------------------
// Animated Platform Demo (Pure Code — No Video)
// ----------------------------------------------------------------------
function AnimatedPlatformDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    let t = 0;

    const draw = () => {
      t += 0.008;
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = "#0F172A";
      ctx.beginPath();
      ctx.roundRect(0, 0, W, H, 16);
      ctx.fill();

      // Top bar
      ctx.fillStyle = "#1E293B";
      ctx.fillRect(0, 0, W, 36);
      // Dots
      ["#EF4444", "#F59E0B", "#22C55E"].forEach((c, i) => {
        ctx.beginPath();
        ctx.arc(18 + i * 18, 18, 5, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();
      });
      // Title bar text
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "10px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("DATAANNOTATE — Consensus Dashboard", W / 2, 22);

      // Sidebar
      ctx.fillStyle = "#1E293B";
      ctx.fillRect(0, 36, 100, H - 36);
      const sideItems = ["Dashboard", "Datasets", "Tasks", "Review", "Settings"];
      sideItems.forEach((item, i) => {
        const y = 60 + i * 32;
        const active = i === Math.floor((t * 0.5) % 5);
        ctx.fillStyle = active ? "rgba(59,130,246,0.15)" : "transparent";
        ctx.beginPath();
        ctx.roundRect(8, y - 8, 84, 26, 6);
        ctx.fill();
        ctx.fillStyle = active ? "#60A5FA" : "rgba(255,255,255,0.3)";
        ctx.font = "9px Inter, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(item, 18, y + 8);
      });

      // Main content area
      const mx = 112, my = 48, mw = W - 124, mh = H - 60;

      // Header row
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.roundRect(mx, my, mw, 34, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "bold 10px Inter, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Consensus Overview", mx + 12, my + 22);

      // Stats cards
      const stats = [
        { label: "Total Tasks", value: "1,248", color: "#3B82F6" },
        { label: "Completed", value: "1,102", color: "#22C55E" },
        { label: "Conflicts", value: "23", color: "#EF4444" },
        { label: "Accuracy", value: "96.4%", color: "#8B5CF6" },
      ];
      const cardW = (mw - 24) / 4;
      stats.forEach((s, i) => {
        const cx = mx + 6 + i * (cardW + 6);
        const cy = my + 46;
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.beginPath();
        ctx.roundRect(cx, cy, cardW, 50, 8);
        ctx.fill();
        // Animated value count
        const numVal = parseFloat(s.value.replace(",", ""));
        const countProgress = Math.min(1, (t * 0.3) % 2);
        const displayVal = s.value.includes("%")
          ? (numVal * countProgress).toFixed(1) + "%"
          : Math.round(numVal * countProgress).toLocaleString();
        ctx.fillStyle = s.color;
        ctx.font = "bold 16px Inter, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(displayVal, cx + 10, cy + 30);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.font = "8px Inter, system-ui, sans-serif";
        ctx.fillText(s.label, cx + 10, cy + 44);
      });

      // Table area
      const tableY = my + 108;
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.roundRect(mx, tableY, mw, mh - 120, 8);
      ctx.fill();

      // Table header
      const cols = ["Task ID", "Schema", "Annotators", "Status", "Score"];
      const colWidths = [0.15, 0.25, 0.2, 0.2, 0.2];
      let colX = mx + 12;
      cols.forEach((col, i) => {
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.font = "bold 8px Inter, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(col, colX, tableY + 18);
        colX += mw * colWidths[i];
      });

      // Animated rows
      const rows = [
        { id: "TSK-0847", schema: "sentiment_v3", annotators: "3 / 3", status: "AGREED", score: "98.2%" },
        { id: "TSK-0848", schema: "ner_v2", annotators: "2 / 3", status: "PENDING", score: "—" },
        { id: "TSK-0849", schema: "classification_v1", annotators: "3 / 3", status: "ADMIN_CONFIRMED", score: "99.1%" },
        { id: "TSK-0850", schema: "sentiment_v3", annotators: "1 / 3", status: "NOT_STARTED", score: "—" },
        { id: "TSK-0851", schema: "ner_v2", annotators: "3 / 3", status: "CONFLICT", score: "72.4%" },
        { id: "TSK-0852", schema: "audio_trans_v1", annotators: "3 / 3", status: "AGREED", score: "95.8%" },
        { id: "TSK-0853", schema: "image_tags_v2", annotators: "2 / 3", status: "PENDING_UPDATE", score: "—" },
      ];

      const statusColors: Record<string, string> = {
        AGREED: "#22C55E",
        PENDING: "#F59E0B",
        ADMIN_CONFIRMED: "#3B82F6",
        NOT_STARTED: "#64748B",
        CONFLICT: "#EF4444",
        PENDING_UPDATE: "#F97316",
      };

      const visibleRows = Math.min(rows.length, Math.floor(t * 1.2) % (rows.length + 1));
      rows.forEach((r, ri) => {
        if (ri > visibleRows) return;
        const ry = tableY + 30 + ri * 26;
        const rowAlpha = ri === visibleRows ? Math.min(1, ((t * 1.2) % 1)) : 1;

        // Row hover highlight on active row
        const activeRow = Math.floor((t * 0.4) % rows.length);
        if (ri === activeRow) {
          ctx.fillStyle = "rgba(59,130,246,0.06)";
          ctx.beginPath();
          ctx.roundRect(mx + 4, ry - 8, mw - 8, 24, 4);
          ctx.fill();
        }

        ctx.globalAlpha = rowAlpha;
        let rx = mx + 12;
        const rowData = [r.id, r.schema, r.annotators, r.status, r.score];
        rowData.forEach((cell, ci) => {
          if (ci === 3) {
            // Status badge
            const badgeColor = statusColors[cell] || "#64748B";
            ctx.fillStyle = badgeColor + "20";
            const tw = ctx.measureText(cell).width;
            ctx.beginPath();
            ctx.roundRect(rx - 3, ry - 7, tw + 10, 16, 4);
            ctx.fill();
            ctx.fillStyle = badgeColor;
            ctx.font = "bold 8px Inter, system-ui, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(cell, rx, ry + 3);
          } else {
            ctx.fillStyle = ci === 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.35)";
            ctx.font = ci === 0 ? "bold 9px Inter, system-ui, sans-serif" : "9px Inter, system-ui, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(cell, rx, ry + 3);
          }
          rx += mw * colWidths[ci];
        });
        ctx.globalAlpha = 1;
      });

      // Mini chart in bottom right
      const chartX = mx + mw - 140;
      const chartY = tableY + 30;
      const chartW = 120;
      const chartH = 60;
      ctx.fillStyle = "rgba(59,130,246,0.06)";
      ctx.beginPath();
      ctx.roundRect(chartX, chartY, chartW, chartH, 8);
      ctx.fill();

      // Animated line chart
      const chartPts = [20, 35, 28, 45, 38, 55, 48, 62, 58, 72, 68, 80];
      const chartProgress = Math.min(1, (t * 0.25) % 1.5);
      const visiblePts = Math.ceil(chartPts.length * chartProgress);

      if (visiblePts > 1) {
        const grad = ctx.createLinearGradient(chartX, chartY, chartX, chartY + chartH);
        grad.addColorStop(0, "rgba(59,130,246,0.15)");
        grad.addColorStop(1, "rgba(59,130,246,0)");
        ctx.beginPath();
        ctx.moveTo(chartX, chartY + chartH);
        for (let i = 0; i < visiblePts; i++) {
          const px = chartX + (i / (chartPts.length - 1)) * chartW;
          const py = chartY + chartH - (chartPts[i] / 90) * chartH;
          ctx.lineTo(px, py);
        }
        ctx.lineTo(chartX + ((visiblePts - 1) / (chartPts.length - 1)) * chartW, chartY + chartH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        for (let i = 0; i < visiblePts; i++) {
          const px = chartX + (i / (chartPts.length - 1)) * chartW;
          const py = chartY + chartH - (chartPts[i] / 90) * chartH;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Cursor
      const cursorX = mx + 40 + Math.sin(t * 0.7) * (mw / 3);
      const cursorY = tableY + 40 + Math.cos(t * 0.5) * 30;
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.moveTo(cursorX, cursorY);
      ctx.lineTo(cursorX, cursorY + 14);
      ctx.lineTo(cursorX + 5, cursorY + 10);
      ctx.lineTo(cursorX + 9, cursorY + 16);
      ctx.lineTo(cursorX + 12, cursorY + 14);
      ctx.lineTo(cursorX + 8, cursorY + 8);
      ctx.lineTo(cursorX + 13, cursorY + 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="relative w-[88%] h-[88%]">
      <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.15)]">
        <canvas ref={canvasRef} width={560} height={420} className="w-full h-full" />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Hero Split Preview: Annotation Workbench Hierarchy → Consensus Matrix
// ----------------------------------------------------------------------
function HeroSplitPreview({ isInView }: { isInView: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
      transition={{ duration: 1.4, ease: premiumEase, delay: 0.2 }}
      className="w-full max-w-[500px] bg-white border border-gray-200/80 backdrop-blur-xl rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:scale-[1.015] hover:shadow-[0_30px_70px_rgba(30,58,138,0.12)] hover:border-blue-500/30 transition-all ease-[cubic-bezier(0.16,1,0.3,1)] duration-500 group relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/0 via-blue-500/[0.02] to-blue-400/[0.03] pointer-events-none rounded-2xl" />
      <div className="absolute inset-0 border border-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl" />

      {/* Header */}
      <div className="flex items-center justify-between z-10 relative mb-4">
        <div className="flex items-center space-x-1.5">
          <Database className="w-4 h-4 text-blue-700 animate-pulse" />
          <span className="text-[10px] font-mono text-gray-500 font-bold tracking-wider uppercase">
            STRUCTURAL MIRROR PREVIEW
          </span>
        </div>
        <span className="text-[10px] font-mono text-gray-400 tracking-wider">
          [SCHEMA_V3]
        </span>
      </div>

      {/* Left side: Annotation Workbench Hierarchy */}
      <div className="grid grid-cols-2 gap-3 z-10 relative">
        <div className="space-y-2">
          <span className="text-[9px] font-mono text-blue-700 font-bold uppercase tracking-widest block mb-2">
            ▸ Annotation Workbench
          </span>
          {[
            { label: "CSV Row Data", depth: 0 },
            { label: "├ Audio Sample", depth: 1 },
            { label: "│ ├ Transcript", depth: 2 },
            { label: "│ └ Speaker ID", depth: 2 },
            { label: "├ Nested Group", depth: 1 },
            { label: "│ └ Repeat [0..N]", depth: 2 },
            { label: "└ Field: Mood", depth: 1 },
          ].map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -15 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.5 + i * 0.08 }}
              style={{ paddingLeft: `${row.depth * 12}px` }}
              className={`text-[10px] font-mono py-1.5 px-2 rounded border ${
                row.depth === 0
                  ? "bg-blue-50 border-blue-200 text-blue-800 font-bold"
                  : "bg-gray-50 border-gray-200 text-gray-600"
              }`}
            >
              {row.label}
            </motion.div>
          ))}
        </div>

        {/* Arrow in the middle */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-[9px] font-mono text-blue-700 font-bold uppercase tracking-widest block mb-2">
            ▸ Consensus Matrix
          </span>
          <div className="space-y-2 w-full">
            {[
              { label: "NOT_STARTED", color: "bg-gray-100 text-gray-500 border-gray-200" },
              { label: "PENDING", color: "bg-amber-50 text-amber-600 border-amber-200" },
              { label: "PENDING_UPDATE", color: "bg-orange-50 text-orange-600 border-orange-200" },
              { label: "AGREED", color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
              { label: "CONFLICT", color: "bg-red-50 text-red-600 border-red-200" },
              { label: "ADMIN_CONFIRMED", color: "bg-blue-50 text-blue-700 border-blue-200" },
            ].map((status, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 15 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.8 + i * 0.08 }}
                className={`text-[9px] font-mono py-1.5 px-2 rounded border font-bold ${status.color}`}
              >
                {status.label}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer badge */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between z-10 relative">
        <span className="text-[9px] font-mono text-gray-400">
          1:1 Structural Hierarchy Mirroring
        </span>
        <span className="text-[9px] font-mono text-blue-700 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
          SYNCED
        </span>
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------------------
// EFFICIENCY DASHBOARD — Animated Charts & Metrics
// ----------------------------------------------------------------------
function EfficiencyDashboard() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-80px" });

  const metrics = [
    { label: "Annotation Accuracy", value: 98.6, suffix: "%", decimals: 1 },
    { label: "Consensus Rate", value: 94.2, suffix: "%", decimals: 1 },
    { label: "Avg. Review Time", value: 3.2, suffix: "s", decimals: 1 },
    { label: "Schema Sync Uptime", value: 99.9, suffix: "%", decimals: 1 },
    { label: "Conflict Resolution", value: 97.1, suffix: "%", decimals: 1 },
  ];

  return (
    <section ref={containerRef} className="py-28 px-6 md:px-12 bg-[#0F172A] relative overflow-hidden">
      {/* Ambient blurs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/[0.06] rounded-full blur-[200px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-400/[0.04] rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: premiumEase }}
            className="text-xs font-mono tracking-[0.25em] text-blue-400 uppercase block mb-4"
          >
            [Platform Efficiency Metrics]
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: premiumEase, delay: 0.1 }}
            className="text-4xl md:text-5xl font-black tracking-tight text-white"
          >
            Real-time performance at a glance
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: premiumEase, delay: 0.2 }}
            className="text-gray-400 leading-relaxed text-sm md:text-base font-medium mt-4 max-w-xl mx-auto"
          >
            Institutional-grade metrics powering every annotation pipeline.
          </motion.p>
        </div>

        {/* Animated Counter Strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: premiumEase, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-6"
        >
          {metrics.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
              className="text-center p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-blue-500/30 hover:bg-white/[0.07] transition-all duration-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.06)]"
            >
              <div className="text-3xl md:text-4xl font-black text-white tracking-tight">
                <AnimatedCounter value={m.value} suffix={m.suffix} decimals={m.decimals} isInView={isInView} />
              </div>
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.15em] mt-2">
                {m.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Gauge Chart */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: premiumEase, delay: 0.5 }}
            className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 hover:border-blue-500/20 transition-all duration-500 hover:bg-white/[0.06]"
          >
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-[0.2em] block mb-2">[Efficiency Rating]</span>
            <h3 className="text-lg font-bold text-white mb-5">Overall Score</h3>
            <GaugeChart isInView={isInView} />
          </motion.div>

          {/* Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: premiumEase, delay: 0.6 }}
            className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 hover:border-blue-500/20 transition-all duration-500 hover:bg-white/[0.06]"
          >
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-[0.2em] block mb-2">[Task Distribution]</span>
            <h3 className="text-lg font-bold text-white mb-5">Pipeline Breakdown</h3>
            <BarChart isInView={isInView} />
          </motion.div>

          {/* Radar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: premiumEase, delay: 0.7 }}
            className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 hover:border-blue-500/20 transition-all duration-500 hover:bg-white/[0.06]"
          >
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-[0.2em] block mb-2">[Quality Radar]</span>
            <h3 className="text-lg font-bold text-white mb-5">Multi-Axis Assessment</h3>
            <RadarChart isInView={isInView} />
          </motion.div>
        </div>

        {/* Performance Line Chart */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: premiumEase, delay: 0.8 }}
          className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 hover:border-blue-500/20 transition-all duration-500 hover:bg-white/[0.06]"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-[0.2em] block mb-1">[Performance Trend]</span>
              <h3 className="text-lg font-bold text-white">Consensus Accuracy Over Time</h3>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1 rounded-full font-bold">
              +12.4% QoQ
            </span>
          </div>
          <LineChart isInView={isInView} />
        </motion.div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// Animated Counter Component
// ----------------------------------------------------------------------
function AnimatedCounter({ value, suffix, decimals, isInView }: { value: number; suffix: string; decimals: number; isInView: boolean }) {
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;
    const duration = 2000;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay((value * eased).toFixed(decimals));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, value, decimals]);

  return <>{display}{suffix}</>;
}

// ----------------------------------------------------------------------
// Gauge Chart (Canvas)
// ----------------------------------------------------------------------
function GaugeChart({ isInView }: { isInView: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    if (!isInView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H * 0.82, r = Math.min(W, H) * 0.38;
    const targetValue = 96;

    let currentValue = 0;
    const animate = () => {
      currentValue += (targetValue - currentValue) * 0.04;
      if (Math.abs(targetValue - currentValue) < 0.1) currentValue = targetValue;
      ctx.clearRect(0, 0, W, H);

      // Background arc
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, 0);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.stroke();

      // Value arc
      const end = Math.PI + (currentValue / 100) * Math.PI;
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, "#3B82F6");
      grad.addColorStop(1, "#1E3A8A");
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, end);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.stroke();

      // Tick marks
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI + (i / 10) * Math.PI;
        const inner = r - 10, outer = r - 4;
        ctx.beginPath();
        ctx.moveTo(cx + inner * Math.cos(a), cy + inner * Math.sin(a));
        ctx.lineTo(cx + outer * Math.cos(a), cy + outer * Math.sin(a));
        ctx.strokeStyle = i <= 2 ? "#EF4444" : i <= 6 ? "#F59E0B" : "#3B82F6";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Needle
      const needleAngle = Math.PI + (currentValue / 100) * Math.PI;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(needleAngle);
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(r - 18, 0);
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fillStyle = "#F3F4F6";
      ctx.fill();
      ctx.restore();

      // Center circle
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#F3F4F6";
      ctx.fill();

      // Value text
      ctx.fillStyle = "#F3F4F6";
      ctx.font = "bold 20px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(Math.round(currentValue) + "%", cx, cy - 18);

      // Label
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "9px Inter, system-ui, sans-serif";
      ctx.fillText("EXCELLENT", cx, cy + 4);

      if (currentValue < targetValue) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [isInView]);

  return <canvas ref={canvasRef} width={220} height={110} className="w-full max-w-[220px] mx-auto" />;
}

// ----------------------------------------------------------------------
// Bar Chart (Canvas)
// ----------------------------------------------------------------------
function BarChart({ isInView }: { isInView: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    if (!isInView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const data = [
      { label: "Text Classification", pct: 0.35 },
      { label: "NER Labeling", pct: 0.25 },
      { label: "Sentiment", pct: 0.20 },
      { label: "Image Tags", pct: 0.12 },
      { label: "Audio Trans.", pct: 0.08 },
    ];
    const barH = 14, gap = 10;
    const startY = 8;
    const maxW = W - 120;
    const colors = ["#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#DBEAFE"];

    let progress = 0;
    const animate = () => {
      progress += 0.03;
      if (progress > 1) progress = 1;
      ctx.clearRect(0, 0, W, H);

      data.forEach((d, i) => {
        const y = startY + i * (barH + gap);
        const bw = Math.max(4, d.pct * maxW * progress);

        // Label
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.font = "9px Inter, system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(d.label, 110, y + barH / 2);

        // Bar bg
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.beginPath();
        ctx.roundRect(118, y, maxW, barH, 4);
        ctx.fill();

        // Bar fill
        const bg = ctx.createLinearGradient(118, 0, 118 + bw, 0);
        bg.addColorStop(0, colors[i]);
        bg.addColorStop(1, colors[Math.min(i, colors.length - 1)] + "99");
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.roundRect(118, y, bw, barH, 4);
        ctx.fill();

        // Value
        ctx.fillStyle = "#F3F4F6";
        ctx.font = "bold 9px Inter, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(Math.round(d.pct * 100 * progress) + "%", 124 + bw, y + barH / 2);
      });

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [isInView]);

  return <canvas ref={canvasRef} width={400} height={100} className="w-full" />;
}

// ----------------------------------------------------------------------
// Radar Chart (Canvas)
// ----------------------------------------------------------------------
function RadarChart({ isInView }: { isInView: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    if (!isInView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 20;
    const labels = ["Accuracy", "Speed", "Consistency", "Coverage", "Scalability", "Quality"];
    const scores = [0.96, 0.82, 0.91, 0.88, 0.78, 0.94];

    let progress = 0;
    const animate = () => {
      progress += 0.025;
      if (progress > 1) progress = 1;
      ctx.clearRect(0, 0, W, H);

      // Grid rings
      for (let lv = 1; lv <= 4; lv++) {
        ctx.beginPath();
        const lr = (lv / 4) * r;
        for (let i = 0; i <= labels.length; i++) {
          const a = (i % labels.length) / labels.length * Math.PI * 2 - Math.PI / 2;
          const x = cx + lr * Math.cos(a), y = cy + lr * Math.sin(a);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Axes
      labels.forEach((_, i) => {
        const a = i / labels.length * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.stroke();
      });

      // Data polygon
      ctx.beginPath();
      for (let i = 0; i <= scores.length; i++) {
        const idx = i % scores.length;
        const a = idx / labels.length * Math.PI * 2 - Math.PI / 2;
        const lr = scores[idx] * r * progress;
        const x = cx + lr * Math.cos(a), y = cy + lr * Math.sin(a);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, "rgba(59,130,246,0.2)");
      rg.addColorStop(1, "rgba(59,130,246,0.05)");
      ctx.fillStyle = rg;
      ctx.fill();
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Nodes
      scores.forEach((s, i) => {
        const a = i / labels.length * Math.PI * 2 - Math.PI / 2;
        const lr = s * r * progress;
        const x = cx + lr * Math.cos(a), y = cy + lr * Math.sin(a);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = "#3B82F6";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(59,130,246,0.3)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Labels
      labels.forEach((lb, i) => {
        const a = i / labels.length * Math.PI * 2 - Math.PI / 2;
        const lr = r + 14;
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "8px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(lb, cx + lr * Math.cos(a), cy + lr * Math.sin(a));
      });

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [isInView]);

  return <canvas ref={canvasRef} width={200} height={200} className="w-full max-w-[200px] mx-auto" />;
}

// ----------------------------------------------------------------------
// Line Chart (Canvas)
// ----------------------------------------------------------------------
function LineChart({ isInView }: { isInView: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    if (!isInView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const pts = [62, 68, 65, 74, 71, 82, 78, 88, 85, 92, 89, 94, 91, 96, 93, 98];
    const mapped = pts.map((v, i) => ({
      x: (i / (pts.length - 1)) * (W - 40) + 20,
      y: H - 20 - ((v - 50) / 55) * (H - 40),
    }));

    let progress = 0;
    const animate = () => {
      progress += 0.02;
      if (progress > 1) progress = 1;
      ctx.clearRect(0, 0, W, H);

      const visibleCount = Math.floor(mapped.length * progress);
      const visiblePts = mapped.slice(0, visibleCount + 1);

      if (visiblePts.length > 1) {
        // Gradient fill
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "rgba(59,130,246,0.15)");
        grad.addColorStop(1, "rgba(59,130,246,0)");
        ctx.beginPath();
        ctx.moveTo(visiblePts[0].x, H);
        visiblePts.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.lineTo(visiblePts[visiblePts.length - 1].x, H);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Line
        ctx.beginPath();
        ctx.moveTo(visiblePts[0].x, visiblePts[0].y);
        visiblePts.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        ctx.stroke();

        // Last dot
        const last = visiblePts[visiblePts.length - 1];
        ctx.beginPath();
        ctx.arc(last.x, last.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "#3B82F6";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(last.x, last.y, 7, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(59,130,246,0.3)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Grid lines
      ctx.setLineDash([2, 4]);
      [0.25, 0.5, 0.75].forEach((f) => {
        const y = f * H;
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(W - 20, y);
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Month labels
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "8px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      mapped.forEach((p, i) => {
        if (i % 3 === 0 && months[i]) {
          ctx.fillText(months[i], p.x, H - 4);
        }
      });

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [isInView]);

  return <canvas ref={canvasRef} width={800} height={180} className="w-full" />;
}

// ----------------------------------------------------------------------
// 2. PROBLEM / SOLUTION — Continuous Consensus Architecture
// ----------------------------------------------------------------------
function ProblemSolution() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  const comparisonRows = [
    {
      traditional: "Lock the administration panel until all annotators finish.",
      ours: "Always-On Panels: Generate and review structural skeletons instantly at 0% or 99% completion."
    },
    {
      traditional: "Invalidate or delete existing work when questions change.",
      ours: "Hot-Schema Syncing: Auto-versioning preserves compatible data and flags changes as PENDING_UPDATE."
    },
    {
      traditional: "Flatten data, destroying nested arrays and loops.",
      ours: "Strict Structural Mirroring: Keeps CSV structures, nested groups, and repeat loops perfectly intact."
    }
  ];

  return (
    <section
      id="problem"
      ref={containerRef}
      className="py-32 px-6 md:px-12 bg-white/80 border-y border-gray-100 relative"
    >
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Header */}
        <div className="max-w-3xl">
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: premiumEase }}
            className="text-xs font-mono tracking-[0.25em] text-blue-700 uppercase block mb-4"
          >
            [01] The Core Problem We Solve
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: premiumEase, delay: 0.1 }}
            className="text-4xl md:text-5xl font-black tracking-tight text-[#111115]"
          >
            Continuous Consensus Architecture
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: premiumEase, delay: 0.2 }}
            className="text-gray-500 leading-relaxed text-sm md:text-base font-medium mt-4 max-w-2xl"
          >
            Traditional data labeling tools break down the moment an admin updates a schema mid-project, or they completely lock admins out of the consensus dashboard until every single annotator hits 100% completion.
          </motion.p>
        </div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.2, ease: premiumEase, delay: 0.3 }}
          className="border border-gray-200/60 rounded-2xl overflow-hidden bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] backdrop-blur-md"
        >
          <div className="grid grid-cols-2 gap-4 bg-gradient-to-r from-gray-50 to-gray-100/80 border-b border-gray-200/60 p-6 text-[10px] font-mono uppercase tracking-[0.2em] font-bold">
            <div className="text-gray-400">What Traditional Tools Do</div>
            <div className="text-blue-700">What Our Platform Does</div>
          </div>
          <div className="divide-y divide-gray-100">
            {comparisonRows.map((row, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, ease: premiumEase, delay: 0.4 + idx * 0.12 }}
                className="grid grid-cols-2 gap-6 p-6 items-start hover:bg-blue-50/20 transition-all duration-300 group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-red-100/60 transition-colors">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <span className="text-[13px] text-gray-400 font-medium leading-relaxed">{row.traditional}</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-blue-100/60 transition-colors">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-700" />
                  </div>
                  <span className="text-[13px] text-gray-700 font-semibold leading-relaxed">{row.ours}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// 3. DEEP-DIVE CORE FEATURES
// ----------------------------------------------------------------------
function CoreFeatures() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  const features = [
    {
      num: "[01]",
      icon: <GitBranch className="w-6 h-6" />,
      title: "Multi-Annotator Isolation & Workspace Cloning",
      desc: "To eradicate human labeler bias, workflows are fully separated. Admins upload raw datasets once and spin up independent, sandboxed workspace clones for individual annotators."
    },
    {
      num: "[02]",
      icon: <Layers className="w-6 h-6" />,
      title: "Zero-Flatten Hierarchy Engine",
      desc: "Your schema data structure remains pure from ingestion to export. Our interface natively mirrors and displays complex data formats without crushing your data models."
    },
    {
      num: "[03]",
      icon: <Zap className="w-6 h-6" />,
      title: "Schema Hot-Swapping & Micro-Versioning",
      desc: "Modified a question, added an option, or deleted a group midway? The platform auto-increments the dataset schema version, updates live annotator workspaces in real time, and tags affected fields with a clean PENDING_UPDATE badge."
    }
  ];

  const hierarchyTypes = [
    "Standard CSV Data Rows",
    "Conditional Branching & Logic Trees",
    "Infinite Nested Form Groups",
    "Dynamic Repeat Groups & Loop Instances"
  ];

  return (
    <section
      id="features"
      ref={containerRef}
      className="py-32 px-6 md:px-12 bg-transparent"
    >
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="max-w-3xl">
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: premiumEase }}
            className="text-xs font-mono tracking-[0.25em] text-blue-700 uppercase block mb-4"
          >
            [02] Deep-Dive Core Features
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: premiumEase, delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-[#111115]"
          >
            Built for enterprise-grade control
          </motion.h2>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">
          {features.map((feat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 35 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1.2, ease: premiumEase, delay: idx * 0.15 }}
              className="space-y-5 border border-gray-200/60 rounded-2xl p-7 bg-white/60 backdrop-blur-sm hover:border-blue-200 hover:shadow-[0_12px_40px_-12px_rgba(30,58,138,0.1)] hover:bg-white/80 transition-all duration-500 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/80 border border-blue-200/60 flex items-center justify-center text-blue-700 group-hover:from-blue-100 group-hover:to-blue-200/60 transition-all duration-300">
                  {feat.icon}
                </div>
                <span className="text-[10px] font-mono text-blue-700 font-bold tracking-wider">{feat.num}</span>
              </div>
              <h3 className="text-[15px] font-bold tracking-tight text-[#111115] leading-snug">{feat.title}</h3>
              <p className="text-[13px] text-gray-400 leading-relaxed font-medium">{feat.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Hierarchy Types Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.4, ease: premiumEase, delay: 0.6 }}
          className="bg-white border border-gray-200/60 rounded-2xl p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_60px_-12px_rgba(30,58,138,0.1)] hover:border-blue-200/60 transition-all duration-500"
        >
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-mono tracking-widest text-blue-700 uppercase font-bold">[Zero-Flatten Hierarchy]</span>
            <span className="text-xs font-mono text-gray-400">Supported Structure Types</span>
          </div>
          <h4 className="text-lg font-bold tracking-tight text-[#111115] mb-6">Native structural data formats preserved end-to-end</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hierarchyTypes.map((htype, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.8 + i * 0.1 }}
                className="flex items-center gap-3 bg-gradient-to-r from-blue-50/50 to-transparent border border-blue-100/60 p-3.5 rounded-xl hover:border-blue-200 transition-colors duration-300"
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 border border-blue-200/60">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-[13px] font-mono font-semibold text-gray-600">{htype}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// 4. INTERACTIVE CONSENSUS & CONFLICT RESOLUTION CENTER
// ----------------------------------------------------------------------
function ConsensusCenter() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  const [sliderValue, setSliderValue] = useState(30);

  const lifecycleStates = [
    { label: "NOT_STARTED", color: "bg-gray-100 text-gray-500 border-gray-200" },
    { label: "PENDING", color: "bg-amber-50 text-amber-600 border-amber-200" },
    { label: "PARTIAL", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { label: "AGREED / CONFLICT", color: "bg-violet-50 text-violet-600 border-violet-200" },
    { label: "ADMIN_CONFIRMED", color: "bg-emerald-50 text-emerald-600 border-emerald-200" }
  ];

  const annotatorData = [
    { name: "Annotator Alpha", color: "text-red-500", bg: "bg-red-500", label: "Positive Sentiment" },
    { name: "Annotator Beta", color: "text-amber-500", bg: "bg-amber-500", label: "Neutral Sentiment" },
    { name: "Annotator Gamma", color: "text-blue-500", bg: "bg-blue-500", label: "Positive Sentiment" }
  ];

  return (
    <section
      id="consensus"
      ref={containerRef}
      className="py-32 px-6 md:px-12 bg-[#F1F1F5]/30 border-t border-gray-200/50"
    >
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-mono tracking-[0.25em] text-blue-700 uppercase block mb-4">
            [03] Consensus & Conflict Resolution Center
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#111115]">
            Take absolute control of your data pipelines
          </h2>
          <p className="text-gray-500 leading-relaxed text-sm md:text-base font-medium mt-4 max-w-xl mx-auto">
            A state-of-the-art dual-interface tracking system with deterministic lifecycle states and instant conflict resolution.
          </p>
        </div>

        {/* Lifecycle state flow */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: premiumEase, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {lifecycleStates.map((state, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className={`text-[10px] font-mono py-2 px-4 rounded-full border font-bold ${state.color}`}>
                {state.label}
              </span>
              {idx < lifecycleStates.length - 1 && (
                <ArrowRight className="w-4 h-4 text-gray-300" />
              )}
            </div>
          ))}
        </motion.div>

        {/* Interactive Slider + Conflict Resolution demo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Left: Slider controls */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs font-mono tracking-[0.2em] text-blue-700 uppercase block">
              [Generate Module Demo]
            </span>
            <h3 className="text-3xl md:text-4xl font-black tracking-tight text-[#111115] leading-tight">
              Resolve divergent values instantly
            </h3>
            <p className="text-gray-500 leading-relaxed text-sm md:text-base font-medium">
              Use single-click annotator selection buttons, or deploy field-specific fallback inputs (Star ratings, ranges, chip sets, text areas) to override data on the fly.
            </p>

            <div className="pt-6 space-y-4">
              <div className="flex justify-between text-xs font-mono text-gray-500">
                <span>Agreement Threshold</span>
                <span className="text-blue-700 font-bold">{sliderValue}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderValue}
                onChange={(e) => setSliderValue(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-700 border border-gray-300"
              />
              <div className="flex justify-between text-[10px] font-mono text-gray-400">
                <span>0% [Scattered]</span>
                <span>100% [Resolved]</span>
              </div>
            </div>

            {/* Review Module description */}
            <div className="pt-4 border-t border-gray-200 space-y-2">
              <span className="text-[10px] font-mono text-blue-700 font-bold uppercase tracking-widest block">
                ▸ The Review Module
              </span>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">
                Access a deep historical audit log containing side-by-side matrices matching raw data, individual responses, and administrative overrides.
              </p>
            </div>
          </div>

          {/* Right: Conflict resolution sandbox */}
          <div className="lg:col-span-7 bg-white border border-gray-200/60 rounded-2xl p-8 relative shadow-[0_12px_50px_-12px_rgba(0,0,0,0.08)] backdrop-blur-md hover:shadow-[0_20px_60px_-12px_rgba(30,58,138,0.1)] hover:border-blue-200/50 transition-all duration-500">
            <div className="absolute top-4 left-6 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">CONFLICT STATE ENGINE</span>
            </div>

            <div className="space-y-6 pt-6">
              {annotatorData.map((ann, idx) => {
                const scatterMultiplier = (100 - sliderValue) / 100;
                const xOffset = (idx - 1) * 35 * scatterMultiplier;
                const yOffset = (idx - 1) * 12 * scatterMultiplier;
                const opacity = sliderValue > 85 ? 0.35 : 1;

                return (
                  <motion.div
                    key={idx}
                    animate={{
                      x: xOffset,
                      y: yOffset,
                      opacity: opacity,
                      borderColor: sliderValue > 85 ? "rgba(59, 130, 246, 0.2)" : "rgba(229, 231, 235, 1)"
                    }}
                    transition={{ type: "spring", stiffness: 150, damping: 20 }}
                    className="bg-gray-50/80 border border-gray-200/60 p-4 rounded-xl flex items-center justify-between hover:border-gray-300 transition-colors duration-300"
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${ann.bg}`} />
                      <span className="text-xs font-mono font-bold text-gray-600">{ann.name}</span>
                    </div>
                    <div className="text-xs font-mono text-gray-500 bg-gray-100 px-3 py-1 rounded">
                      Label: <span className={`${ann.color} font-bold`}>"{ann.label}"</span>
                    </div>
                  </motion.div>
                );
              })}

              {/* Resolved Truth card */}
              <AnimatePresence>
                {sliderValue > 85 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ duration: 0.5, ease: premiumEase }}
                    className="bg-blue-50 border border-blue-300 p-5 rounded-xl flex items-center justify-between shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none" />
                    <div className="flex items-center space-x-3 z-10">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 border border-blue-300">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div>
                        <span className="text-xs font-mono text-blue-700 font-bold block uppercase tracking-wider">ADMIN_CONFIRMED</span>
                        <span className="text-[10px] text-gray-500">All submissions merged to "Positive Sentiment"</span>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-blue-700 font-bold bg-blue-100 border border-blue-300 px-3 py-1 rounded z-10">
                      Agreement: 100%
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// 5. FINAL CALL TO ACTION
// ----------------------------------------------------------------------
function FinalCTA() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <section
      id="comparison"
      ref={containerRef}
      className="py-32 px-6 md:px-12 bg-transparent"
    >
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1.4, ease: premiumEase }}
        className="max-w-4xl mx-auto text-center relative"
      >
        {/* Glow */}
        <div className="absolute inset-0 bg-blue-500/[0.04] blur-[120px] rounded-full pointer-events-none -z-10" />

        <span className="text-xs font-mono tracking-[0.25em] text-blue-700 uppercase block mb-6">
          [04] Ready to Secure Your Ground Truth?
        </span>

        <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#111115] leading-tight mb-6">
          Stop letting rigid pipelines and incomplete annotations block your validation cycles.
        </h2>

        <p className="text-gray-500 leading-relaxed text-base md:text-lg max-w-2xl mx-auto font-medium mb-10">
          Experience continuous data engineering with always-on consensus panels, hot-schema syncing, and strict structural mirroring.
        </p>

        <div className="flex flex-wrap gap-4 justify-center pt-4">
          <Link href="/signup">
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0_8px_30px_rgba(30,58,138,0.4)" }}
              whileTap={{ scale: 0.97 }}
              className="bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-700 hover:to-blue-800 text-white px-10 py-4 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase shadow-[0_4px_24px_rgba(30,58,138,0.3)] transition-all duration-300 border border-blue-700/30"
            >
              Deploy Your First Dataset Now
            </motion.button>
          </Link>
          <Link href="/login">
            <motion.button
              whileHover={{ scale: 1.03, backgroundColor: "rgba(59,130,246,0.04)" }}
              whileTap={{ scale: 0.97 }}
              className="border border-gray-200 hover:border-blue-300 bg-white/60 backdrop-blur-sm text-gray-600 hover:text-blue-800 px-10 py-4 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase transition-all duration-300 shadow-sm"
            >
              Sign In
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

// ----------------------------------------------------------------------
// FOOTER & Live Ticker
// ----------------------------------------------------------------------
function Footer() {
  const tickerWords = [
    "CONSENSUS V2: OPERATIONAL [99.98%]",
    "SCHEMA HOT-SWAP: ACTIVE",
    "NEVER HIDE ROWS · NEVER HIDE UNSUBMITTED FIELDS",
    "STRUCTURAL MIRRORING: ENFORCED",
    "PENDING_UPDATE BADGES: LIVE",
    "ADMIN PANELS: ALWAYS-ON",
    "ZERO-FLATTEN HIERARCHY: GUARANTEED"
  ];

  return (
    <footer className="bg-[#0F172A] text-[#F3F4F6] border-t border-gray-200/50 pt-20 pb-12 overflow-hidden relative">
      {/* Live Scrolling Ticker */}
      <div className="w-full py-5 border-y border-white/[0.06] bg-black/30 overflow-hidden mb-16 flex items-center relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0F172A] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0F172A] to-transparent z-10 pointer-events-none" />
        <div className="flex whitespace-nowrap animate-[marquee_25s_linear_infinite] hover:[animation-play-state:paused] cursor-pointer">
          {Array(3).fill(tickerWords).flat().map((item, idx) => (
            <span key={idx} className="inline-flex items-center mx-8 text-xs font-mono uppercase tracking-[0.25em] text-gray-400">
              <span className="w-2 h-2 rounded-full bg-blue-500 mr-3 inline-block animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12 pt-8">
        <div className="space-y-4">
          <span className="font-extrabold text-2xl tracking-wider text-white">DATAANNOTATE</span>
          <p className="text-xs text-gray-400 font-medium leading-relaxed">
            Enterprise-grade data annotation engine built around complete administrative control, dynamic multi-layer schema synchronization, and deterministic consensus.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-mono uppercase text-gray-500 tracking-wider">[Navigation]</h4>
          <ul className="space-y-2 text-xs font-semibold tracking-wide text-gray-300">
            <li><a href="#problem" className="hover:text-white transition-colors">Problem & Solution</a></li>
            <li><a href="#features" className="hover:text-white transition-colors">Core Features</a></li>
            <li><a href="#consensus" className="hover:text-white transition-colors">Consensus Center</a></li>
            <li><Link href="/documentation" className="hover:text-white transition-colors">Documentation</Link></li>
            <li><a href="#comparison" className="hover:text-white transition-colors">Deploy Now</a></li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-mono uppercase text-gray-500 tracking-wider">[Architecture Contract]</h4>
          <div className="space-y-2 text-xs text-gray-400 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              <span>Never hide rows</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              <span>Never hide unsubmitted fields</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              <span>Always-on admin panels</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              <span>DatasetAccessService.validateAccess()</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 md:text-right">
          <span className="text-[10px] font-mono text-gray-500 block">© 2026 DATAANNOTATE.</span>
          <span className="text-[10px] font-mono text-gray-500 block">ALL RIGHTS RESERVED STRICTLY.</span>
          <span className="text-[10px] font-mono text-blue-400 block font-bold">[CONTINUOUS CONSENSUS ARCHITECTURE]</span>
        </div>
      </div>
    </footer>
  );
}
