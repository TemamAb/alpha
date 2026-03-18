-- Enable pgcrypto for UUID generation if using Postgres < 13 (built-in for 13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trades Table Schema
CREATE TABLE IF NOT EXISTS trades (
    trade_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    chain VARCHAR(50) NOT NULL,
    strategy VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    profit_usd NUMERIC(20, 6), -- High precision for profit tracking
    tx_hash VARCHAR(255),
    gas_cost_usd NUMERIC(20, 6),
    loan_amount NUMERIC(36, 18),
    details JSONB, -- Flexible storage for trade specifics (tokens, path, DEXs used)
    
    -- Data Integrity Constraints
    CONSTRAINT chk_status CHECK (status IN ('success', 'failed', 'pending'))
);

-- =====================================================================================
-- Indexes for High-Performance Filtering & Pagination
-- =====================================================================================

-- 1. Primary Sort Index: Essential for "ORDER BY timestamp DESC" pagination
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades (timestamp DESC);

-- 2. Single Column Indexes: For filtering by individual fields
CREATE INDEX IF NOT EXISTS idx_trades_chain ON trades (chain);
CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades (strategy);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades (status);

-- 3. Composite Indexes: Optimized for common dashboard views (e.g., "Recent successful trades on Polygon")
-- These allow the database to filter and sort in a single pass without sorting in memory.
CREATE INDEX IF NOT EXISTS idx_trades_chain_status_timestamp ON trades (chain, status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_strategy_status_timestamp ON trades (strategy, status, timestamp DESC);