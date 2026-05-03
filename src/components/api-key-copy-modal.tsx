import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"

interface ApiKeyCopyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rawKey: string | null
}

export function ApiKeyCopyModal({ open, onOpenChange, rawKey }: ApiKeyCopyModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (rawKey) {
      navigator.clipboard.writeText(rawKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Key Created</DialogTitle>
          <DialogDescription>
            Copy your API key now. You won't be able to see it again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-surface border border-border p-4 font-mono text-sm break-all">
            {rawKey}
          </div>

          <Button onClick={handleCopy} variant="outline" className="w-full">
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-success" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Key
              </>
            )}
          </Button>

          <Button onClick={() => onOpenChange(false)} className="w-full">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
