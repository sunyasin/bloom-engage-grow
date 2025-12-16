/*
  # Update transactions table for YooKassa integration
  
  1. Changes
    - Add provider column for payment provider identification
    - Add updated_at column for tracking transaction updates
    - Update payment_status enum to include 'succeeded' and 'canceled' statuses
    - Add index on provider_payment_id for faster webhook lookups
    
  2. Notes
    - The status 'paid' will be mapped to 'succeeded' for YooKassa
    - Existing transactions remain untouched
*/

-- Add provider column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'provider'
  ) THEN
    ALTER TABLE transactions ADD COLUMN provider TEXT DEFAULT 'yookassa';
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE transactions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Update payment_status enum to include succeeded and canceled
DO $$
BEGIN
  -- Check if succeeded already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'succeeded'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
  ) THEN
    ALTER TYPE payment_status ADD VALUE 'succeeded';
  END IF;
  
  -- Check if canceled already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'canceled'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
  ) THEN
    ALTER TYPE payment_status ADD VALUE 'canceled';
  END IF;
END $$;

-- Create index on provider_payment_id for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_transactions_provider_payment_id ON transactions(provider_payment_id);

-- Create index on user_id for faster user queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Add trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_transactions_updated_at ON transactions;

CREATE TRIGGER trigger_update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();
