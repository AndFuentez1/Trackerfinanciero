ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS source_message_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_loans_user_source_message
  ON public.loans(user_id, source_message_id)
  WHERE source_message_id IS NOT NULL;
