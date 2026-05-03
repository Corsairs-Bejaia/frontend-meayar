// Mock data layer — simulates the NestJS backend.
// All shapes mirror what the real API would return so swapping is trivial.

export type VerificationStatus = "approved" | "review" | "rejected" | "processing" | "pending";

export type Verification = {
  id: string;
  ref: string;
  doctorName: string;
  specialty: string;
  nationalId: string;
  status: VerificationStatus;
  score: number;
  submittedAt: string;
  processingTime: string;
  flags: number;
};

export const verifications: Verification[] = [
  { id: "v1", ref: "VER-2026-0847", doctorName: "Dr. Amina Belkacem", specialty: "Cardiology", nationalId: "1985031512458", status: "approved", score: 94, submittedAt: "2 min ago", processingTime: "1m 12s", flags: 0 },
  { id: "v2", ref: "VER-2026-0846", doctorName: "Dr. Karim Hadj-Salem", specialty: "General Medicine", nationalId: "1979082234781", status: "review", score: 67, submittedAt: "8 min ago", processingTime: "2m 04s", flags: 3 },
  { id: "v3", ref: "VER-2026-0845", doctorName: "Dr. Yasmine Bouzid", specialty: "Pediatrics", nationalId: "1988111978223", status: "approved", score: 91, submittedAt: "14 min ago", processingTime: "0m 58s", flags: 0 },
  { id: "v4", ref: "VER-2026-0844", doctorName: "Dr. Mehdi Lounis", specialty: "Surgery", nationalId: "1972062845129", status: "processing", score: 0, submittedAt: "16 min ago", processingTime: "—", flags: 0 },
  { id: "v5", ref: "VER-2026-0843", doctorName: "Dr. Salima Cherif", specialty: "Dermatology", nationalId: "1990041527364", status: "rejected", score: 31, submittedAt: "32 min ago", processingTime: "1m 47s", flags: 5 },
  { id: "v6", ref: "VER-2026-0842", doctorName: "Dr. Rachid Benali", specialty: "Radiology", nationalId: "1981092311456", status: "approved", score: 88, submittedAt: "47 min ago", processingTime: "1m 22s", flags: 1 },
  { id: "v7", ref: "VER-2026-0841", doctorName: "Dr. Nour El Houda Khelifi", specialty: "Oncology", nationalId: "1986030712890", status: "review", score: 72, submittedAt: "1 h ago", processingTime: "2m 19s", flags: 2 },
  { id: "v8", ref: "VER-2026-0840", doctorName: "Dr. Tarek Mansouri", specialty: "Neurology", nationalId: "1975051934672", status: "approved", score: 96, submittedAt: "1 h ago", processingTime: "0m 51s", flags: 0 },
  { id: "v9", ref: "VER-2026-0839", doctorName: "Dr. Lina Bouchareb", specialty: "Gynecology", nationalId: "1989081623417", status: "approved", score: 89, submittedAt: "2 h ago", processingTime: "1m 08s", flags: 0 },
  { id: "v10", ref: "VER-2026-0838", doctorName: "Dr. Fares Abdelkader", specialty: "Orthopedics", nationalId: "1983072845129", status: "review", score: 64, submittedAt: "3 h ago", processingTime: "2m 32s", flags: 4 },
];

export const kpis = {
  total: { value: 2847, change: 12.4 },
  approvalRate: { value: 87.3, change: 2.1 },
  pendingReviews: { value: 23, change: -8.0 },
  avgTime: { value: 1.4, change: -15.2 }, // minutes
};

export const timeline = [
  { date: "Mon", total: 312, approved: 271, rejected: 18 },
  { date: "Tue", total: 389, approved: 342, rejected: 22 },
  { date: "Wed", total: 421, approved: 372, rejected: 19 },
  { date: "Thu", total: 398, approved: 351, rejected: 24 },
  { date: "Fri", total: 467, approved: 412, rejected: 28 },
  { date: "Sat", total: 351, approved: 308, rejected: 21 },
  { date: "Sun", total: 509, approved: 451, rejected: 30 },
];

export const distribution = [
  { name: "Approved", value: 2484, color: "var(--success)" },
  { name: "Review", value: 187, color: "var(--warning)" },
  { name: "Rejected", value: 142, color: "var(--destructive)" },
  { name: "Processing", value: 34, color: "var(--primary)" },
];

export type AgentStep = {
  id: string;
  label: string;
  status: "done" | "active" | "pending" | "failed";
  duration?: string;
  confidence?: number;
  tools?: { name: string; confidence: number; outcome: "fail" | "pass" }[];
};

export type ExtractedField = {
  label: string;
  value: string;
  confidence: number;
};

export type ConsistencyCheck = {
  label: string;
  status: "pass" | "fail" | "warn";
  detail: string;
};

export type ScoreTier = {
  label: string;
  score: number;
  weight: number;
};

export type VerificationDetail = Verification & {
  agentSteps: AgentStep[];
  documents: { type: string; status: "authentic" | "flagged"; confidence: number }[];
  extracted: { documentLabel: string; fields: ExtractedField[] }[];
  consistency: ConsistencyCheck[];
  tiers: ScoreTier[];
  blockers: string[];
};

export function getVerificationDetail(id: string): VerificationDetail {
  const base = verifications.find((v) => v.id === id) ?? verifications[0];
  const isReview = base.status === "review";
  const isReject = base.status === "rejected";
  return {
    ...base,
    agentSteps: [
      { id: "kyc", label: "Identity (KYC)", status: "done", duration: "2.3s", confidence: 0.98 },
      { id: "classify", label: "Document classification", status: "done", duration: "1.1s", confidence: 0.96, tools: [
        { name: "CLIP-vision", confidence: 0.96, outcome: "pass" },
      ]},
      { id: "ocr", label: "OCR & extraction", status: "done", duration: "4.7s", confidence: 0.94, tools: [
        { name: "PaddleOCR", confidence: 0.45, outcome: "fail" },
        { name: "Tesseract", confidence: 0.52, outcome: "fail" },
        { name: "GPT-4o Vision", confidence: 0.94, outcome: "pass" },
      ]},
      { id: "auth", label: "Authenticity check", status: isReject ? "failed" : "done", duration: "3.2s", confidence: isReject ? 0.31 : 0.91 },
      { id: "cnas", label: "CNAS cross-reference", status: "done", duration: "12.4s", confidence: 0.88 },
      { id: "consistency", label: "Cross-document consistency", status: isReview ? "failed" : "done", duration: "1.8s", confidence: isReview ? 0.62 : 0.95 },
      { id: "score", label: "Score calculation", status: "done", duration: "0.3s" },
      { id: "decision", label: "Final decision", status: "done", duration: "0.1s" },
    ],
    documents: [
      { type: "National ID", status: "authentic", confidence: 0.97 },
      { type: "CNAS Affiliation", status: isReview ? "flagged" : "authentic", confidence: isReview ? 0.58 : 0.91 },
      { type: "Medical Diploma", status: isReject ? "flagged" : "authentic", confidence: isReject ? 0.44 : 0.93 },
      { type: "Work Agreement", status: "authentic", confidence: 0.89 },
    ],
    extracted: [
      {
        documentLabel: "National ID",
        fields: [
          { label: "Full name (FR)", value: base.doctorName.replace("Dr. ", ""), confidence: 0.98 },
          { label: "National ID number", value: base.nationalId, confidence: 0.99 },
          { label: "Date of birth", value: "15 / 03 / 1985", confidence: 0.96 },
          { label: "Wilaya", value: "Algiers", confidence: 0.93 },
        ],
      },
      {
        documentLabel: "Medical Diploma",
        fields: [
          { label: "Doctor name", value: base.doctorName.replace("Dr. ", ""), confidence: 0.94 },
          { label: "University", value: "Université d'Alger 1 — Faculté de médecine", confidence: 0.91 },
          { label: "Specialty", value: base.specialty, confidence: 0.89 },
          { label: "Graduation year", value: "2012", confidence: isReject ? 0.42 : 0.95 },
        ],
      },
    ],
    consistency: [
      { label: "Name match across documents", status: "pass", detail: "98% similarity (ID ↔ Diploma ↔ CNAS)" },
      { label: "National ID consistency", status: "pass", detail: "Identical across 3 documents" },
      { label: "Employer name match", status: isReview ? "fail" : "pass", detail: isReview ? "Diploma references different institution than CNAS" : "Verified against CNAS registry" },
      { label: "Timeline plausibility", status: "pass", detail: "Graduation → first employment chronologically valid" },
      { label: "Diploma seal authenticity", status: isReject ? "fail" : "warn", detail: isReject ? "Seal pattern does not match registry" : "Low confidence (62%) — manual check suggested" },
    ],
    tiers: [
      { label: "Identity", score: 96, weight: 25 },
      { label: "Employment", score: isReview ? 58 : 89, weight: 25 },
      { label: "Credentials", score: isReject ? 32 : 91, weight: 30 },
      { label: "Integrity", score: isReview ? 64 : 92, weight: 20 },
    ],
    blockers: isReject
      ? ["Diploma authenticity below threshold (44%)", "University registry mismatch"]
      : isReview
      ? ["Employer name mismatch between diploma and CNAS"]
      : [],
  };
}
