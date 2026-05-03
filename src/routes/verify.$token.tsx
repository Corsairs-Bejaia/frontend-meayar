import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import {
  ShieldCheck, Upload, FileText, Check, ArrowRight, ArrowLeft,
  Camera, Clock, Lock, Sparkles, Loader2, X, FileBadge,
  Award, CreditCard, Briefcase, AlertCircle, AlertTriangle,
  ChevronDown
} from "lucide-react";
import logo from "@/assets/logo.svg";
import {
  getPortalSession,
  bulkUploadPortalDocuments,
  submitPortalVerification,
  type PortalSession
} from "@/lib/api/portal";

export const Route = createFileRoute("/verify/$token")({
  component: Wizard,
  head: () => ({ meta: [{ title: "Verify your credentials — Meayar" }] }),
});

const steps = ["Welcome", "Identity", "Documents", "Review", "Processing", "Result"] as const;
type Step = (typeof steps)[number];

const layers = [
  {
    title: "Layer 2 — Academic Qualifications",
    docs: [
      { key: "diploma_medical", label: "Diplôme de Docteur en Médecine" },
      { key: "diploma_residency", label: "Diplôme de Résidanat" },
      { key: "diploma_master", label: "Diplôme de Magister / Master" },
      { key: "cert_scolarite", label: "Certificat de scolarité" },
      { key: "diploma_foreign", label: "Diplôme étranger + Équivalence MESRS" },
    ]
  },
  {
    title: "Layer 3 — Professional Standing",
    docs: [
      { key: "carte_pro", label: "Carte professionnelle ou Attestation d'inscription" },
      { key: "auth_liberal", label: "Autorisation d'exercice libéral" },
      { key: "agrement_clinique", label: "Agrément de clinique / laboratoire" },
      { key: "cert_non_sanction", label: "Certificat de non-sanction disciplinaire" },
      { key: "attest_non_condamnation", label: "Attestation de non-condamnation" },
    ]
  },
  {
    title: "Layer 4 — Employment",
    docs: [
      { key: "cnas_employeur", label: "Attestation d'affiliation employeur CNAS" },
      { key: "attest_travail", label: "Attestation de travail" },
      { key: "convention_sante", label: "Convention avec un établissement de santé" },
    ]
  },
  {
    title: "Layer 5 — Social & Financial Coverage",
    docs: [
      { key: "carte_chifa", label: "Carte Chifa" },
      { key: "cnas_maj", label: "Attestation de mise à jour CNAS" },
      { key: "casnos_affil", label: "Attestation d'affiliation CASNOS" },
      { key: "casnos_maj", label: "Attestation de mise à jour CASNOS" },
    ]
  },
  {
    title: "Layer 6 — Active Practice",
    docs: [
      { key: "ordonnance_recent", label: "Ordonnance médicale récente" },
      { key: "cachet_pro", label: "Cachet professionnel (Tampon)" },
      { key: "lettre_reco", label: "Lettre de recommandation institutionnelle" },
      { key: "attest_stage", label: "Attestation de stage / de service" },
    ]
  }
];

// Helper to flatten docs for quick lookups
const allDocTypes = layers.flatMap(l => l.docs);

function Wizard() {
  const { token } = Route.useParams();
  
  const [step, setStep] = useState<Step>("Welcome");
  const [consent, setConsent] = useState(false);
  const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  
  const [expandedLayer, setExpandedLayer] = useState<number>(0);
  
  const [session, setSession] = useState<PortalSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await getPortalSession(token);
        const sess = res.data;
        setSession(sess);

        // Hydrate uploads state
        const loadedUploads: Record<string, boolean> = {};
        for (const doc of sess.documents) {
          loadedUploads[doc.docType] = true;
        }
        setUploads(loadedUploads);

        // Hydrate current step based on session status
        if (sess.status === "completed" || sess.status === "failed") {
          setStep("Result");
        } else if (sess.status === "running") {
          setStep("Processing");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load session");
      } finally {
        setLoadingSession(false);
      }
    }
    load();
  }, [token]);

  const stepIndex = steps.indexOf(step);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, docKey: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFiles((prev) => ({ ...prev, [docKey]: file }));
    }
  };

  const removePendingFile = (docKey: string) => {
    setPendingFiles((prev) => {
      const next = { ...prev };
      delete next[docKey];
      return next;
    });
  };

  const handleBulkUpload = async () => {
    const filesToUpload = Object.entries(pendingFiles);
    
    // If no new files to upload, just proceed
    if (filesToUpload.length === 0) {
      setStep("Review");
      return;
    }

    setIsBulkUploading(true);
    try {
      const files = filesToUpload.map(([_, file]) => file);
      const metadata = filesToUpload.map(([key, _]) => ({ docType: key }));
      
      const res = await bulkUploadPortalDocuments(token, files, metadata);
      
      if (res.data.failed && res.data.failed.length > 0) {
        alert(`Some files failed to upload:\n` + res.data.failed.map(f => `Index ${f.index}: ${f.error}`).join("\n"));
      }
      
      const newUploads = { ...uploads };
      res.data.uploaded.forEach(u => {
        newUploads[u.docType] = true;
      });
      setUploads(newUploads);
      
      // Keep any failed files in pending
      if (res.data.failed.length === 0) {
        setPendingFiles({});
        setStep("Review");
      } else {
        // Remove successfully uploaded ones from pending
        setPendingFiles(prev => {
          const next = { ...prev };
          res.data.uploaded.forEach(u => {
            delete next[u.docType];
          });
          return next;
        });
      }
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsBulkUploading(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="mt-4 text-xl font-semibold">Session Error</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="Meayar Logo" className="h-8 w-8 object-contain" />
            <span className="font-display text-base font-semibold">Meayar</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span className="font-mono uppercase tracking-wider text-[10px]">Encrypted · Law 18-07</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mx-auto max-w-3xl px-6 pb-4">
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <div
                key={s}
                className="flex-1 h-1 rounded-full overflow-hidden bg-muted"
              >
                <motion.div
                  initial={false}
                  animate={{ width: i <= stepIndex ? "100%" : "0%" }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background: i < stepIndex ? "var(--success)" :
                      i === stepIndex ? "linear-gradient(90deg, var(--primary), var(--primary-glow))" :
                      "transparent",
                    boxShadow: i === stepIndex ? "0 0 8px var(--primary-glow)" : undefined,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Step {stepIndex + 1} of {steps.length}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground">{step}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <AnimatePresence mode="wait">
          {step === "Welcome" && (
            <Frame key="welcome">
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="relative mx-auto h-20 w-20 grid place-items-center"
                >
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
                  <img src={logo} alt="Meayar Logo" className="relative h-20 w-20 object-contain drop-shadow-2xl" />
                </motion.div>
                <h1 className="mt-8 font-display text-4xl md:text-5xl font-semibold tracking-tight">
                  Verify your <span className="text-gradient">medical credentials</span>
                </h1>
                <p className="mt-4 max-w-md mx-auto text-muted-foreground">
                  Welcome back, Dr. {session.doctor.lastName}. A short, secure flow to confirm your identity and qualifications. Your data is encrypted end-to-end.
                </p>
                <div className="mt-10 max-w-md mx-auto text-left">
                  <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                      <div>
                        <p className="font-semibold text-warning">Optional, but highly recommended.</p>
                        <p className="mt-1 text-sm text-warning/90">
                          You may skip any document, but please note that providing fewer documents will significantly lower your verification score and increase the likelihood of rejection.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-surface ring-1 ring-border px-3 py-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  About 5–10 minutes
                </div>

                <label className="mt-8 flex items-start gap-3 max-w-md mx-auto text-left text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border bg-surface accent-primary"
                  />
                  <span className="text-muted-foreground">
                    I consent to Meayar processing my documents in accordance with <span className="text-foreground underline">Law 18-07</span> on personal data protection.
                  </span>
                </label>

                <button
                  disabled={!consent}
                  onClick={() => setStep("Identity")}
                  className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed glow-ring"
                >
                  Begin verification
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </Frame>
          )}

          {step === "Identity" && (
            <Frame key="identity">
              <h2 className="font-display text-3xl font-semibold tracking-tight">Confirm your identity</h2>
              <p className="mt-2 text-muted-foreground">
                We use a third-party KYC provider (Sumsub) for liveness and ID verification.
              </p>

              <div className="mt-8 rounded-xl border border-border bg-surface p-8 text-center">
                <div className="mx-auto h-16 w-16 grid place-items-center rounded-full bg-primary/15 ring-1 ring-primary/30">
                  <Camera className="h-7 w-7 text-primary-glow" />
                </div>
                <p className="mt-5 font-medium">Take a quick selfie & scan your ID</p>
                <p className="mt-1 text-xs text-muted-foreground">Hold your camera steady — this takes ~30 seconds.</p>
                <button
                  onClick={() => setStep("Documents")}
                  className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors glow-ring"
                >
                  Open camera
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setStep("Documents")}
                  className="block mx-auto mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                >
                  Skip (demo mode)
                </button>
              </div>

              <NavRow onBack={() => setStep("Welcome")} />
            </Frame>
          )}

          {step === "Documents" && (
            <Frame key="docs">
              <h2 className="font-display text-3xl font-semibold tracking-tight">Upload your documents</h2>
              <p className="mt-2 text-muted-foreground">PDF, JPG or PNG. All files are optional but missing files lower your score.</p>
              
              <div className="mt-6 rounded-xl border border-warning/30 bg-warning/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning">Notice regarding missing documents</p>
                    <p className="mt-1 text-sm text-warning/90">
                      While every document here is marked as optional, our AI system relies on these files to verify your credentials. Submitting fewer documents will result in a lower trust score and likely lead to an automatic rejection by the platform.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                {layers.map((layer, i) => (
                  <div key={layer.title} className="rounded-xl border border-border bg-surface overflow-hidden">
                    <button
                      onClick={() => setExpandedLayer(expandedLayer === i ? -1 : i)}
                      className="w-full flex items-center justify-between p-4 bg-surface-elevated hover:bg-surface transition-colors"
                    >
                      <h3 className="font-medium text-sm">{layer.title}</h3>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedLayer === i ? "rotate-180" : ""}`} />
                    </button>
                    
                    <AnimatePresence>
                      {expandedLayer === i && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 pt-0 space-y-2 border-t border-border">
                            {layer.docs.map((d) => {
                              const uploaded = uploads[d.key];
                              const pendingFile = pendingFiles[d.key];
                              
                              return (
                                <div key={d.key} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                                  <div className="flex-1 min-w-0 pr-4">
                                    <p className="font-medium text-sm text-foreground truncate" title={d.label}>{d.label}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {uploaded ? "Already uploaded securely" : pendingFile ? pendingFile.name : "Optional"}
                                    </p>
                                  </div>
                                  
                                  {uploaded ? (
                                    <div className="flex items-center gap-2 text-success bg-success/10 px-3 py-1.5 rounded-md text-xs font-medium border border-success/20">
                                      <Check className="h-3.5 w-3.5" />
                                      Uploaded
                                    </div>
                                  ) : pendingFile ? (
                                    <div className="flex items-center gap-2">
                                      <div className="text-primary-glow bg-primary/10 px-3 py-1.5 rounded-md text-xs font-medium border border-primary/20">
                                        Ready to upload
                                      </div>
                                      <button 
                                        onClick={() => removePendingFile(d.key)}
                                        className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="cursor-pointer inline-flex items-center gap-2 rounded-md bg-surface border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                                      <Upload className="h-3.5 w-3.5" />
                                      Select File
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleFileSelect(e, d.key)}
                                      />
                                    </label>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex items-center justify-between pt-6 border-t border-border">
                <button onClick={() => setStep("Identity")} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  disabled={isBulkUploading}
                  onClick={handleBulkUpload}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed glow-ring"
                >
                  {isBulkUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      Save & Continue <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </Frame>
          )}

          {step === "Review" && (
            <Frame key="review">
              <h2 className="font-display text-3xl font-semibold tracking-tight">Looks right?</h2>
              <p className="mt-2 text-muted-foreground">A quick check before we run the full verification.</p>

              <div className="mt-8 space-y-2">
                {allDocTypes.filter((d) => uploads[d.key]).map((d) => (
                  <div key={d.key} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                    <div className="grid place-items-center h-9 w-9 rounded-md bg-success/15 text-success">
                      <Check className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{d.label}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">Stored securely</p>
                    </div>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
                {allDocTypes.filter((d) => uploads[d.key]).length === 0 && (
                  <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-center">
                    <p className="text-sm font-medium text-warning">No documents uploaded</p>
                    <p className="text-xs text-warning/80 mt-1">You are submitting this verification with no supporting documents. It will likely fail.</p>
                  </div>
                )}
              </div>

              <NavRow
                onBack={() => setStep("Documents")}
                onNext={async () => {
                  try {
                    await submitPortalVerification(token);
                    setStep("Processing");
                  } catch (err: any) {
                    alert(`Failed to submit: ${err.message}`);
                  }
                }}
                nextLabel="Start verification"
              />
            </Frame>
          )}

          {step === "Processing" && <Processing key="proc" token={token} onDone={(sess) => {
            setSession(sess);
            setStep("Result");
          }} />}

          {step === "Result" && <Result key="result" session={session} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

function NavRow({ onBack, onNext, nextLabel = "Continue" }: { onBack?: () => void; onNext?: () => void; nextLabel?: string }) {
  return (
    <div className="mt-10 flex items-center justify-between">
      {onBack ? (
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      ) : <span />}
      <button
        disabled={!onNext}
        onClick={onNext}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed glow-ring"
      >
        {nextLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

const procSteps = [
  { label: "Identity verified", duration: 2300 },
  { label: "Documents classified", duration: 1100 },
  { label: "Extracting data", duration: 4700 },
  { label: "Authenticity check", duration: 3200 },
  { label: "CNAS cross-reference", duration: 4200 },
  { label: "Consistency check", duration: 1800 },
  { label: "Calculating score", duration: 800 },
] as const;

function Processing({ token, onDone }: { token: string; onDone: (sess: PortalSession) => void }) {
  const [done, setDone] = useState<number>(0);
  const BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://mediverify.up.railway.app";

  useEffect(() => {
    const es = new EventSource(`${BASE_URL}/api/portal/stream/${token}`);

    es.addEventListener("step_completed", () => {
      setDone((d) => Math.min(d + 1, procSteps.length - 1));
    });

    es.addEventListener("pipeline_completed", (e) => {
      const data = JSON.parse(e.data);
      setDone(procSteps.length);
      setTimeout(() => onDone(data.session), 600);
      es.close();
    });

    es.addEventListener("pipeline_failed", (e) => {
      const data = JSON.parse(e.data);
      setDone(procSteps.length);
      setTimeout(() => onDone(data.session), 600);
      es.close();
    });

    return () => es.close();
  }, [token, onDone, BASE_URL]);

  return (
    <Frame>
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="mx-auto h-20 w-20 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent, var(--primary-glow), transparent)`,
            mask: "radial-gradient(circle, transparent 38px, black 39px, black 40px, transparent 41px)",
            WebkitMask: "radial-gradient(circle, transparent 38px, black 39px, black 40px, transparent 41px)",
          }}
        />
        <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight">Verifying your credentials</h2>
        <p className="mt-2 text-muted-foreground">Eight agents are reviewing your documents in parallel.</p>
      </div>

      <div className="mt-10 max-w-md mx-auto space-y-2">
        {procSteps.map((s, i) => {
          const isDone = i < done;
          const isActive = i === done;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                isDone ? "border-success/30 bg-success/5" :
                isActive ? "border-primary/40 bg-primary/10" :
                "border-border bg-surface"
              }`}
            >
              <div className={`grid place-items-center h-7 w-7 rounded-full ring-1 ${
                isDone ? "bg-success/20 text-success ring-success/30" :
                isActive ? "bg-primary/20 text-primary-glow ring-primary/30" :
                "bg-muted text-muted-foreground ring-border"
              }`}>
                {isDone ? <Check className="h-3.5 w-3.5" /> : isActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="font-mono text-[10px]">{i + 1}</span>}
              </div>
              <span className={`text-sm flex-1 ${isDone || isActive ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              {isDone && <span className="font-mono text-[10px] text-muted-foreground">{(s.duration / 1000).toFixed(1)}s</span>}
              {isActive && <span className="font-mono text-[10px] text-primary-glow">in progress…</span>}
            </motion.div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        You can close this page — we'll email you the result.
      </p>
    </Frame>
  );
}

function Result({ session }: { session: PortalSession }) {
  const isFailed = session.status === "failed";
  const score = session.score ? Math.round(session.score * 100) : 0;

  return (
    <Frame>
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 14 }}
          className="relative mx-auto h-24 w-24"
        >
          <div className={`absolute inset-0 rounded-full blur-2xl ${isFailed ? "bg-destructive/30" : "bg-success/30"}`} />
          <div className={`relative grid place-items-center h-24 w-24 rounded-full bg-gradient-to-br ${isFailed ? "from-destructive to-destructive/70" : "from-success to-success/70"}`}>
            {isFailed ? (
              <X className="h-11 w-11 text-destructive-foreground" strokeWidth={3} />
            ) : (
              <Check className="h-11 w-11 text-success-foreground" strokeWidth={3} />
            )}
          </div>
        </motion.div>
        <h2 className="mt-8 font-display text-4xl md:text-5xl font-semibold tracking-tight">
          {isFailed ? "Verification " : "You're "}
          <span className={isFailed ? "text-destructive" : "text-success"}>
            {isFailed ? "failed" : "verified"}
          </span>.
        </h2>
        <p className="mt-3 max-w-md mx-auto text-muted-foreground">
          {isFailed
            ? "Unfortunately, we could not verify your credentials based on the provided documents. Please contact support."
            : "All checks passed. Your credentials have been confirmed and the result has been forwarded to the requesting platform."}
        </p>

        {!isFailed && session.score != null && (
          <div className="mt-10 inline-flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4">
            <Sparkles className="h-4 w-4 text-primary-glow" />
            <div className="text-left">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Verification score</p>
              <p className="font-display text-2xl font-semibold text-success">{score} / 100</p>
            </div>
          </div>
        )}

        <div className="mt-10">
          {session.signedRedirectUrl ? (
            <a
              href={session.signedRedirectUrl}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all glow-ring"
            >
              Return to platform
              <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors underline">
              Return to Meayar home
            </Link>
          )}
        </div>
      </div>
    </Frame>
  );
}
