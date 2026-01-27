-- Create webhook_logs table for logging all webhook calls
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  webhook_name TEXT NOT NULL,
  request_url TEXT,
  request_method TEXT,
  request_headers JSONB,
  request_payload JSONB,
  response_status INTEGER,
  response_body JSONB,
  error_message TEXT,
  processing_time_ms INTEGER
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only superusers can view webhook logs
CREATE POLICY "Superusers can view webhook logs"
  ON public.webhook_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'superuser'::app_role));

-- System can insert logs (from edge functions with service role)
CREATE POLICY "System can insert webhook logs"
  ON public.webhook_logs
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_webhook_name ON public.webhook_logs(webhook_name);