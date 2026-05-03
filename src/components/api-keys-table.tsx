import { useEffect, useState } from "react"
import { listApiKeys, deleteApiKey, type ApiKey } from "@/lib/api/apiKeys"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ApiKeysTableProps {
  refreshTrigger: number
}

export function ApiKeysTable({ refreshTrigger }: ApiKeysTableProps) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadKeys()
  }, [refreshTrigger])

  const loadKeys = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await listApiKeys()
      if (response.success) {
        setKeys(response.data)
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load API keys"
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key?")) {
      return
    }

    setDeletingId(id)

    try {
      const response = await deleteApiKey(id)
      if (response.success) {
        setKeys(keys.filter((key) => key.id !== id))
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to delete API key"
      alert(errorMsg)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Loading API keys...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/15 border border-destructive/30 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-destructive">Failed to load API keys</p>
          <p className="text-sm text-destructive/80">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadKeys}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (keys.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        No API keys created yet
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border">
            <TableHead>Name</TableHead>
            <TableHead>Key Prefix</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Rate Limit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Used</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((key) => (
            <TableRow key={key.id} className="border-b border-border hover:bg-surface/50">
              <TableCell className="font-medium">{key.name}</TableCell>
              <TableCell className="font-mono text-sm">{key.keyPrefix}...</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {key.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="inline-flex px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-sm">{key.rateLimit}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                    key.isActive
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {key.isActive ? "Active" : "Revoked"}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(key.createdAt), {
                  addSuffix: true,
                })}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {key.lastUsedAt
                  ? formatDistanceToNow(new Date(key.lastUsedAt), {
                      addSuffix: true,
                    })
                  : "Never"}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(key.id)}
                  disabled={deletingId === key.id}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
