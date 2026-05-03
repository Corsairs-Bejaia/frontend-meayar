import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, KeyRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ApiKeysTable } from "@/components/api-keys-table";
import { ApiKeyFormModal } from "@/components/api-keys-form";
import { ApiKeyCopyModal } from "@/components/api-key-copy-modal";

export const Route = createFileRoute("/api-keys/")({
  component: ApiKeysPage,
  head: () => ({ meta: [{ title: "API Keys — Meayar" }] }),
});

function ApiKeysPage() {
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleApiKeySuccess = (rawKey: string) => {
    setFormModalOpen(false);
    setTimeout(() => {
      setNewRawKey(rawKey);
    }, 150);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleCopyModalClose = (open: boolean) => {
    if (!open) {
      setNewRawKey(null);
    }
  };

  return (
    <>
      <AppShell
        title="API Keys"
        subtitle="Manage authentication tokens for programmatic access to the Meayar API"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-3 flex-1 mr-4 max-w-sm">
            <KeyRound className="h-4 w-4 text-primary-glow shrink-0" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Security</p>
              <p className="font-display text-sm font-semibold">Keep your keys safe</p>
            </div>
          </div>
          <Button
            onClick={() => setFormModalOpen(true)}
            className="inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Generate new key
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="p-5 border-b border-border bg-surface-elevated/30">
            <h3 className="font-display text-base font-semibold">Active credentials</h3>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
              Tokens currently authorized for this tenant
            </p>
          </div>
          <div className="p-5">
            <ApiKeysTable refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </AppShell>

      <ApiKeyFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        onSuccess={handleApiKeySuccess}
      />
      <ApiKeyCopyModal
        open={!!newRawKey}
        onOpenChange={handleCopyModalClose}
        rawKey={newRawKey}
      />
    </>
  );
}
