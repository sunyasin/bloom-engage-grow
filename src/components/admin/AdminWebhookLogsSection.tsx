import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RefreshCw, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { Json } from "@/integrations/supabase/types";

interface WebhookLog {
  id: string;
  created_at: string;
  webhook_name: string;
  request_url: string | null;
  request_method: string | null;
  request_headers: Json | null;
  request_payload: Json | null;
  response_status: number | null;
  response_body: Json | null;
  error_message: string | null;
  processing_time_ms: number | null;
}

export function AdminWebhookLogsSection() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching webhook logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getStatusBadge = (status: number | null, errorMessage: string | null) => {
    if (errorMessage || (status && status >= 400)) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          {status || "Error"}
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="gap-1 bg-green-600">
        <CheckCircle className="h-3 w-3" />
        {status || 200}
      </Badge>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Логи вебхуков</h2>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Логи вебхуков пока отсутствуют
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground min-w-[140px]">
                  {format(new Date(log.created_at), "dd.MM.yyyy HH:mm:ss", { locale: ru })}
                </div>
                <Badge variant="outline">{log.webhook_name}</Badge>
                {getStatusBadge(log.response_status, log.error_message)}
                {log.processing_time_ms && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {log.processing_time_ms}ms
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {log.error_message && (
                  <span className="text-sm text-destructive max-w-[300px] truncate">
                    {log.error_message}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLog(log)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Детали вебхука</DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.created_at), "dd.MM.yyyy HH:mm:ss", { locale: ru })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Webhook</label>
                  <p className="font-mono text-sm">{selectedLog.webhook_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Статус</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedLog.response_status, selectedLog.error_message)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Метод</label>
                  <p className="font-mono text-sm">{selectedLog.request_method || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Время обработки</label>
                  <p className="font-mono text-sm">{selectedLog.processing_time_ms}ms</p>
                </div>
              </div>

              {selectedLog.request_url && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">URL</label>
                  <p className="font-mono text-sm break-all bg-muted p-2 rounded">
                    {selectedLog.request_url}
                  </p>
                </div>
              )}

              {selectedLog.error_message && (
                <div>
                  <label className="text-sm font-medium text-destructive">Ошибка</label>
                  <p className="font-mono text-sm bg-destructive/10 text-destructive p-2 rounded">
                    {selectedLog.error_message}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Headers</label>
                <pre className="font-mono text-xs bg-muted p-3 rounded overflow-x-auto max-h-[150px]">
                  {JSON.stringify(selectedLog.request_headers, null, 2)}
                </pre>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Payload</label>
                <pre className="font-mono text-xs bg-muted p-3 rounded overflow-x-auto max-h-[200px]">
                  {JSON.stringify(selectedLog.request_payload, null, 2)}
                </pre>
              </div>

              {selectedLog.response_body && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Response</label>
                  <pre className="font-mono text-xs bg-muted p-3 rounded overflow-x-auto max-h-[150px]">
                    {JSON.stringify(selectedLog.response_body, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
