-- Create classifier_rules table to store user-specific classification feedback
CREATE TABLE IF NOT EXISTS public.classifier_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pattern TEXT NOT NULL, -- The keyword or product code
    category TEXT NOT NULL, -- The human-readable category name
    type TEXT NOT NULL CHECK (type IN ('keyword', 'code')), -- Type of match
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, pattern, type)
);

-- Enable RLS
ALTER TABLE public.classifier_rules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own classifier rules"
    ON public.classifier_rules
    FOR ALL
    USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_classifier_rules_user_pattern ON public.classifier_rules (user_id, pattern);

-- Enable realtime
ALTER TABLE public.classifier_rules REPLICA IDENTITY FULL;
alter publication supabase_realtime add table public.classifier_rules;
