-- Create competitors table
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  website_url TEXT,
  logo_url TEXT,
  primary_angle TEXT,
  predicted_ctr NUMERIC(4,2),
  status TEXT DEFAULT 'tracking', -- 'tracking', 'outperforming', 'threat'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create competitor_moves table
CREATE TABLE IF NOT EXISTS competitor_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE NOT NULL,
  move_type TEXT NOT NULL, -- 'ad_launched', 'price_change', 'positioning_pivot', 'hook_change'
  title TEXT NOT NULL,
  description TEXT,
  ad_media_url TEXT,
  predicted_ctr NUMERIC(4,2),
  risk_level TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage competitors of their businesses"
  ON competitors FOR ALL
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage moves of their competitors"
  ON competitor_moves FOR ALL
  USING (
    competitor_id IN (
      SELECT c.id FROM competitors c
      JOIN businesses b ON c.business_id = b.id
      WHERE b.owner_id = auth.uid()
    )
  );
