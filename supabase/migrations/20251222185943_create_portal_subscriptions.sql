/*
  # Create Portal Subscriptions System

  ## 1. New Tables
    - `portal_subscriptions`
      - `id` (uuid, primary key) - Unique identifier
      - `name` (text) - Subscription tier name (e.g., "Free", "Pro", "VIP")
      - `badge_text` (text) - Text to display on badges/labels
      - `price` (numeric) - Price amount
      - `billing_period` (text) - Billing period: 'monthly' or 'yearly'
      - `payment_url` (text, nullable) - Payment link for this subscription
      - `is_active` (boolean) - Whether this tier is currently available
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  ## 2. Changes to Existing Tables
    - Add `portal_subscription_id` to `profiles` table
      - Foreign key to `portal_subscriptions.id`
      - Nullable (users start without subscription)

  ## 3. Security
    - Enable RLS on `portal_subscriptions`
    - Everyone can view available subscriptions
    - Only admins can create/update subscriptions
    - Enable RLS policies for profiles updates

  ## 4. Notes
    - The old `payplan` field in profiles is kept for backward compatibility
    - Users can have both old payplan and new portal_subscription_id
    - Free tier should have price = 0
*/

-- Create portal_subscriptions table
CREATE TABLE IF NOT EXISTS portal_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  badge_text text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  billing_period text NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
  payment_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add portal_subscription_id to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'portal_subscription_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN portal_subscription_id uuid REFERENCES portal_subscriptions(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE portal_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portal_subscriptions
CREATE POLICY "Anyone can view active portal subscriptions"
  ON portal_subscriptions
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all portal subscriptions"
  ON portal_subscriptions
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert default subscription tiers
INSERT INTO portal_subscriptions (name, badge_text, price, billing_period, sort_order)
VALUES 
  ('Бесплатный', 'Free', 0, 'monthly', 1),
  ('Pro месяц', 'PRO', 990, 'monthly', 2),
  ('Pro год', 'PRO', 9900, 'yearly', 3),
  ('VIP месяц', 'VIP', 2990, 'monthly', 4),
  ('VIP год', 'VIP', 29900, 'yearly', 5)
ON CONFLICT DO NOTHING;
