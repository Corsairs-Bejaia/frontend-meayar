import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Cpu, Eye, FileSearch, Zap, Lock, Activity } from "lucide-react";
import logo from "@/assets/logo.svg";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Meayar — AI verification for medical credentials" },
      { name: "description", content: "Verify medical professionals in under 90 seconds. Multi-agent OCR, authenticity checks, CNAS cross-reference and full audit trail." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen w-full">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="Meayar Logo" className="h-8 w-8 object-contain" />
            <span className="font-display text-base font-semibold">Meayar</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#agents" className="hover:text-foreground transition-colors">Agents</a>
            <a href="#trust" className="hover:text-foreground transition-colors">Trust</a>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://stark-3.gitbook.io/untitled"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
            >
              API Documentation ↗
            </a>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors glow-ring"
            >
              Open dashboard
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-60" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Live · 2,847 verifications this month
              </span>
            </div>

            <h1 className="mt-8 font-display text-5xl md:text-7xl font-semibold leading-[1.02] tracking-tight">
              <span className="text-foreground">Verify a doctor</span>
              <br />
              <span className="text-gradient">in 90 seconds.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed">
              Multi-agent OCR, authenticity forensics, CNAS cross-reference and a full audit trail —
              packaged as a single API and a dashboard your compliance team will actually enjoy.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                to="/dashboard"
                className="group inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all glow-ring"
              >
                Open the command center
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/verify/$token"
                params={{ token: "demo-doc-amina" }}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/60 px-5 py-3 text-sm font-medium text-foreground hover:bg-surface-elevated transition-colors"
              >
                See the doctor flow
              </Link>
            </div>
          </motion.div>

          {/* Floating live panel */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-3"
          >
            {[
              { icon: Cpu, label: "Agents", value: "8 / 8", note: "online" },
              { icon: Zap, label: "P50 latency", value: "1.4 m", note: "−15% w/w" },
              { icon: Lock, label: "Compliance", value: "Law 18-07", note: "audit-ready" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="glass rounded-xl p-5 flex items-center gap-4"
              >
                <div className="grid place-items-center h-10 w-10 rounded-lg bg-primary/15 ring-1 ring-primary/30">
                  <s.icon className="h-4 w-4 text-primary-glow" />
                </div>
                <div className="flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{s.label}</p>
                  <p className="font-display text-2xl font-semibold mt-0.5">{s.value}</p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">{s.note}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="border-t border-border bg-surface/30">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">The pipeline</p>
          <h2 className="mt-3 font-display text-3xl md:text-5xl font-semibold tracking-tight max-w-2xl">
            Eight agents.<br />One verdict.
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Each step self-corrects. When one tool fails, the next takes over — and every decision is traced.
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Eye, label: "KYC", note: "Liveness · ID match" },
              { icon: FileSearch, label: "Classification", note: "Identifies each document" },
              { icon: Cpu, label: "OCR / Extraction", note: "Paddle → GPT-4o fallback" },
              { icon: ShieldCheck, label: "Authenticity", note: "Seals · fonts · forensics" },
              { icon: Activity, label: "CNAS check", note: "Live registry scrape" },
              { icon: FileSearch, label: "Consistency", note: "Cross-document match" },
              { icon: Zap, label: "Scoring", note: "Weighted, explainable" },
              { icon: Lock, label: "Decision", note: "Auto · review · reject" },
            ].map((step, i) => (
              <div
                key={step.label}
                className="group relative rounded-xl border border-border bg-surface p-4 hover:border-border-strong transition-colors"
              >
                <span className="font-mono text-[10px] text-muted-foreground">0{i + 1}</span>
                <step.icon className="h-5 w-5 mt-3 text-primary-glow" />
                <p className="mt-3 font-medium">{step.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{step.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="trust" className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight max-w-2xl mx-auto">
            Built for the people who decide<br />who treats patients.
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-muted-foreground">
            Hospitals, insurers, and digital health platforms — same API, same dashboard.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors glow-ring"
            >
              Explore the dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2026 Meayar · Hackathon prototype</p>
          <p className="font-mono">Aligned with Law 18-07</p>
        </div>
      </footer>
    </div>
  );
}
