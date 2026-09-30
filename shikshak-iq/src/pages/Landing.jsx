import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  HiOutlineSparkles,
  HiOutlineAcademicCap,
  HiOutlineUserGroup,
  HiOutlineChartBar,
  HiOutlineLightBulb,
  HiOutlineCamera,
  HiOutlineTranslate,
  HiOutlineShieldCheck,
  HiOutlineChevronDown,
  HiOutlineArrowRight,
  HiOutlineGlobe,
  HiOutlinePresentationChartLine,
  HiOutlineClipboardList,
  HiOutlineDocumentReport,
} from 'react-icons/hi';

// ─── Parallax Hero ───────────────────────────────────────────────────────────

function FloatingParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 4,
    duration: 3 + Math.random() * 4,
    delay: Math.random() * 3,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, rgba(139,92,246,0.6), rgba(6,182,212,0.3))`,
            boxShadow: `0 0 ${p.size * 2}px rgba(139,92,246,0.3)`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

function GlowingOrb() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <motion.div
        className="w-[600px] h-[600px] rounded-full"
        style={{
          background:
            'radial-gradient(circle at center, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.08) 30%, rgba(6,182,212,0.04) 60%, transparent 80%)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

// ─── Feature Card ────────────────────────────────────────────────────────────

function FeatureCard({ icon: Icon, title, description, glow = 'purple', index }) {
  const glowColors = {
    purple: 'from-purple-500/20 via-purple-500/5 to-transparent',
    blue: 'from-blue-500/20 via-blue-500/5 to-transparent',
    cyan: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
    pink: 'from-pink-500/20 via-pink-500/5 to-transparent',
    green: 'from-green-500/20 via-green-500/5 to-transparent',
  };
  const iconColors = {
    purple: 'text-purple-400 bg-purple-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/10',
    pink: 'text-pink-400 bg-pink-500/10',
    green: 'text-green-400 bg-green-500/10',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.34, 1.56, 0.64, 1] }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative"
    >
      {/* Glow background */}
      <div
        className={`absolute -inset-0.5 bg-gradient-to-br ${glowColors[glow]} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`}
      />

      {/* Card */}
      <div className="relative glass rounded-2xl p-6 h-full border border-white/5 group-hover:border-white/15 transition-all duration-500">
        <div
          className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${iconColors[glow]} mb-4 group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon size={24} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-purple-300 group-hover:bg-clip-text transition-all duration-300">
          {title}
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

// ─── Stat Counter ────────────────────────────────────────────────────────────

function StatCounter({ value, suffix = '', label, glow = 'purple' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isInView.current) {
          isInView.current = true;
          const duration = 2000;
          const steps = 30;
          const increment = value / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  const glowColors = {
    purple: 'from-purple-400 to-purple-600',
    blue: 'from-blue-400 to-blue-600',
    cyan: 'from-cyan-400 to-cyan-600',
    pink: 'from-pink-400 to-pink-600',
    green: 'from-green-400 to-green-600',
  };

  return (
    <div ref={ref} className="text-center">
      <div className={`text-4xl md:text-5xl font-bold bg-gradient-to-r ${glowColors[glow]} bg-clip-text text-transparent`}>
        {count}
        {suffix}
      </div>
      <div className="text-sm text-gray-500 mt-2">{label}</div>
    </div>
  );
}

// ─── Step Card ───────────────────────────────────────────────────────────────

function StepCard({ number, title, description, icon: Icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: number * 0.15 }}
      className="flex gap-5 group"
    >
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform duration-300">
          {number}
        </div>
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-purple-500/30 to-transparent" />
      </div>
      <div className="pb-12">
        <div className="flex items-center gap-3 mb-2">
          <Icon className="text-purple-400" size={20} />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

// ─── Language Badge ──────────────────────────────────────────────────────────

const languages = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
];

function LanguageBubble({ lang, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      whileHover={{ scale: 1.1, y: -4 }}
      className="glass rounded-xl px-4 py-3 text-center border border-white/5 hover:border-purple-500/30 transition-all duration-300 cursor-default"
    >
      <div className="text-sm font-semibold text-white">{lang.native}</div>
      <div className="text-xs text-gray-500 mt-0.5">{lang.name}</div>
    </motion.div>
  );
}

// ─── Main Landing Component ──────────────────────────────────────────────────

export default function Landing() {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  // ─── Container variants ──────────────────────────────────────────────────
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] overflow-hidden">
      {/* ─── Top Navigation Bar ──────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">IQ</span>
              </div>
              <span className="text-lg font-semibold text-white">
                Shikshak<span className="text-purple-400">IQ</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Nav is intentionally clean - portal buttons are in the hero section below */}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      {/* Spacer for fixed nav */}
      <div className="h-16" />
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-16"
      >
        <FloatingParticles />
        <GlowingOrb />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0f]/30 to-[#0a0a0f] z-[1]" />
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-purple-500/5 to-transparent z-[1]" />

        {/* Hero Content */}
        <AnimatePresence>
          {mounted && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="relative z-10 max-w-5xl mx-auto text-center"
            >
              {/* Badge */}
              <motion.div variants={itemVariants} className="mb-6">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-purple-400 border border-purple-500/20">
                  <HiOutlineSparkles size={14} />
                  AI-Powered Educational Intelligence Platform
                </span>
              </motion.div>

              {/* Main Heading */}
              <motion.h1
                variants={itemVariants}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.1] mb-6"
              >
                <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                  Shikshak
                </span>
                <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  IQ
                </span>
              </motion.h1>

              {/* Tagline */}
              <motion.p
                variants={itemVariants}
                className="text-lg sm:text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-4 leading-relaxed"
              >
                Transform your classroom with the power of{' '}
                <span className="text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text font-semibold">
                  Artificial Intelligence
                </span>
              </motion.p>

              <motion.p
                variants={itemVariants}
                className="text-sm sm:text-base text-gray-500 max-w-2xl mx-auto mb-10"
              >
                AI-powered quiz generation, automated grading, knowledge tracing, and personalized learning analytics — all in one futuristic platform.
              </motion.p>

              {/* Portal Selection Buttons */}
              <motion.div
                variants={itemVariants}
                className="flex flex-wrap items-center justify-center gap-4"
              >
                <motion.button
                  onClick={() => navigate('/teacher-portal')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="group relative px-8 py-3.5 rounded-xl font-semibold text-sm text-white overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 group-hover:opacity-90 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl" />
                  <span className="relative flex items-center gap-2">
                    <HiOutlineAcademicCap size={18} />
                    Teacher Portal
                    <HiOutlineArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </span>
                </motion.button>

                <motion.button
                  onClick={() => navigate('/student-portal')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="group relative px-8 py-3.5 rounded-xl font-semibold text-sm text-white overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 group-hover:opacity-90 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl" />
                  <span className="relative flex items-center gap-2">
                    <HiOutlineUserGroup size={18} />
                    Student Portal
                    <HiOutlineArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </span>
                </motion.button>

                <motion.button
                  onClick={scrollToFeatures}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-8 py-3.5 rounded-xl font-medium text-sm text-gray-300 glass border border-white/10 hover:border-purple-500/30 hover:text-white transition-all"
                >
                  Explore Features
                </motion.button>
              </motion.div>

              {/* Demo Account Note */}
              <motion.div variants={itemVariants} className="mt-8">
                <p className="text-xs text-gray-600">
                  No sign-up required • Teachers: lakshmi@shikshakiq.com • Students: student.aarav / student123
                </p>
              </motion.div>

              {/* Scroll indicator */}
              <motion.div
                variants={itemVariants}
                className="mt-16"
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <HiOutlineChevronDown className="text-gray-500 mx-auto" size={24} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* ─── Features Section ─────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 px-4 py-24 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-blue-400 border border-blue-500/20 mb-4">
            <HiOutlineSparkles size={14} />
            Powerful Features
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Everything a{' '}
            <span className="text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
              Modern Educator
            </span>{' '}
            Needs
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            From AI quiz generation to deep learning analytics — ShikshakIQ empowers teachers with cutting-edge tools.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={HiOutlineAcademicCap}
            title="AI Quiz Generation"
            description="Generate high-quality quizzes instantly with Google Gemini AI. Customize by class, subject, difficulty, and marks."
            glow="purple"
            index={0}
          />
          <FeatureCard
            icon={HiOutlineCamera}
            title="Camera Scanning"
            description="Students can scan handwritten answer sheets using their device camera. Gemini Vision reads and grades them automatically."
            glow="blue"
            index={1}
          />
          <FeatureCard
            icon={HiOutlineChartBar}
            title="Bayesian Knowledge Tracing"
            description="Track concept mastery probabilities with BKT. Identify weak areas and predict student learning trajectories."
            glow="cyan"
            index={2}
          />
          <FeatureCard
            icon={HiOutlineLightBulb}
            title="Item Response Theory"
            description="Measure question difficulty, student ability, and question discrimination with IRT-powered analytics."
            glow="pink"
            index={3}
          />
          <FeatureCard
            icon={HiOutlineUserGroup}
            title="Student Management"
            description="Manage students across Classes 6-10. Add, edit, delete, or import from CSV with parent details."
            glow="green"
            index={4}
          />
          <FeatureCard
            icon={HiOutlineTranslate}
            title="11 Language Support"
            description="AI teachers and reports in English, Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi & Urdu."
            glow="purple"
            index={5}
          />
          <FeatureCard
            icon={HiOutlinePresentationChartLine}
            title="Deep Analytics Dashboard"
            description="Premium AI dashboard with 3D charts, mastery timelines, concept maps, and risk predictions for every student."
            glow="blue"
            index={6}
          />
          <FeatureCard
            icon={HiOutlineDocumentReport}
            title="AI Report Generation"
            description="Auto-generate teacher, student, and parent reports. WhatsApp-ready messages in the parent's preferred language."
            glow="cyan"
            index={7}
          />
          <FeatureCard
            icon={HiOutlineShieldCheck}
            title="Secure & Scalable"
            description="JWT-authenticated, role-based access. Each teacher sees only their class. Built on Flask + React for production readiness."
            glow="pink"
            index={8}
          />
        </div>
      </section>

      {/* ─── Stats Section ────────────────────────────────────────────────── */}
      <section className="relative z-10 px-4 py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/3 via-transparent to-cyan-500/3" />
        <div className="max-w-5xl mx-auto">
          <div className="glass rounded-3xl p-10 md:p-16 border border-white/5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              <StatCounter value={5} suffix="" label="Classes Supported" glow="purple" />
              <StatCounter value={11} suffix="" label="Languages" glow="blue" />
              <StatCounter value={180} suffix="+" label="Students per Class" glow="cyan" />
              <StatCounter value={3} suffix="×" label="Learning Models" glow="pink" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────────────────────────────── */}
      <section className="relative z-10 px-4 py-24 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-cyan-400 border border-cyan-500/20 mb-4">
            <HiOutlineClipboardList size={14} />
            Simple Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            How{' '}
            <span className="text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text">
              ShikshakIQ
            </span>{' '}
            Works
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            From setup to insights in three simple steps.
          </p>
        </motion.div>

        <div className="max-w-lg mx-auto">
          <StepCard
            number={1}
            icon={HiOutlineUserGroup}
            title="Add Your Students"
            description="Import your class roster manually or via CSV. Each student gets a profile with parent contact details."
          />
          <StepCard
            number={2}
            icon={HiOutlineAcademicCap}
            title="Create & Conduct Quizzes"
            description="Build quizzes manually or let AI generate them. Students can answer on paper and submit via camera or upload."
          />
          <StepCard
            number={3}
            icon={HiOutlineChartBar}
            title="Get AI-Powered Insights"
            description="Gemini grades papers, BKT tracks mastery, IRT measures ability. Generate reports for teachers, students & parents."
          />
        </div>
      </section>

      {/* ─── AI Engine Section ────────────────────────────────────────────── */}
      <section className="relative z-10 px-4 py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent" />
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-pink-400 border border-pink-500/20 mb-4">
              <HiOutlineSparkles size={14} />
              Triple AI Engine
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Powered by{' '}
              <span className="text-transparent bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text">
                Three AI Models
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              ShikshakIQ combines Google Gemini, Bayesian Knowledge Tracing, and Item Response Theory for unparalleled educational intelligence.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Google Gemini',
                desc: 'Generates quizzes, scans answer sheets, evaluates handwriting, calculates scores, and provides natural-language feedback in 11 languages.',
                gradient: 'from-purple-600 to-blue-600',
              },
              {
                title: 'BKT Engine',
                desc: 'Bayesian Knowledge Tracing calculates concept mastery probability, tracks learning progress, predicts weaknesses, and recommends reteaching priorities.',
                gradient: 'from-blue-600 to-cyan-600',
              },
              {
                title: 'IRT Engine',
                desc: 'Item Response Theory measures question difficulty, student ability scores, question discrimination power, and predicts future performance.',
                gradient: 'from-cyan-600 to-green-600',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -6 }}
                className="glass rounded-2xl p-8 border border-white/5 hover:border-white/15 transition-all duration-500"
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-5 shadow-lg`}
                >
                  <HiOutlineSparkles className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Languages Section ─────────────────────────────────────────────── */}
      <section className="relative z-10 px-4 py-24 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-green-400 border border-green-500/20 mb-4">
            <HiOutlineGlobe size={14} />
            Multilingual
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Available in{' '}
            <span className="text-transparent bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text">
              11 Languages
            </span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            AI responses, reports, and WhatsApp messages adapt to the parent's preferred language.
          </p>
        </motion.div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-3">
          {languages.map((lang, i) => (
            <LanguageBubble key={lang.code} lang={lang} index={i} />
          ))}
        </div>
      </section>

      {/* ─── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-4 py-32">
        <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 via-transparent to-transparent" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">
            Ready to Transform{' '}
            <span className="text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text">
              Your Classroom?
            </span>
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
            Join the future of education. No credit card, no sign-up — just instant access to the most advanced AI teaching platform.
          </p>
          <motion.button
            onClick={() => navigate('/teacher-portal')}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.97 }}
            className="group relative px-10 py-4 rounded-xl font-semibold text-white text-base overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 group-hover:opacity-90 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl" />
            <span className="relative flex items-center gap-2">
              Get Started Now — It's Free
              <HiOutlineArrowRight
                size={20}
                className="group-hover:translate-x-1 transition-transform"
              />
            </span>
          </motion.button>
        </motion.div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">IQ</span>
            </div>
            <span className="text-sm text-gray-500">
              ShikshakIQ &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="text-xs text-gray-600">
            Built with React • Three.js • Flask • Gemini AI • BKT • IRT
          </div>
          <Link
            to="/login"
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            Teacher Login &rarr;
          </Link>
        </div>
      </footer>
    </div>
  );
}
