-- Alpha-Orion PostgreSQL Database Sharding Configuration
-- Implements horizontal scaling for high-throughput arbitrage data

-- Create sharding functions
CREATE OR REPLACE FUNCTION get_shard_id(user_id BIGINT, total_shards INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN (user_id % total_shards) + 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_asset_shard(asset_symbol TEXT, total_shards INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Use hash of asset symbol for consistent sharding
    RETURN (abs(hashtext(asset_symbol)) % total_shards) + 1;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for distributed ID generation
CREATE SEQUENCE global_trade_id_seq START 1 INCREMENT 1;

-- Trade History Sharding Tables (by user_id)
CREATE TABLE trade_history_shard_1 (
    trade_id BIGINT DEFAULT nextval('global_trade_id_seq'),
    user_id BIGINT NOT NULL,
    asset_symbol TEXT NOT NULL,
    trade_type TEXT NOT NULL, -- 'buy', 'sell', 'arbitrage'
    quantity DECIMAL(36,18) NOT NULL,
    price DECIMAL(36,18) NOT NULL,
    total_value DECIMAL(36,18) NOT NULL,
    fee DECIMAL(36,18) DEFAULT 0,
    exchange TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    arbitrage_id BIGINT,
    profit_loss DECIMAL(36,18),
    execution_time_ms INTEGER,
    gas_used BIGINT,
    gas_price DECIMAL(36,18),
    PRIMARY KEY (trade_id, user_id)
) PARTITION BY HASH (user_id);

CREATE TABLE trade_history_shard_2 () INHERITS (trade_history_shard_1);
CREATE TABLE trade_history_shard_3 () INHERITS (trade_history_shard_1);
CREATE TABLE trade_history_shard_4 () INHERITS (trade_history_shard_1);
CREATE TABLE trade_history_shard_5 () INHERITS (trade_history_shard_1);
CREATE TABLE trade_history_shard_6 () INHERITS (trade_history_shard_1);
CREATE TABLE trade_history_shard_7 () INHERITS (trade_history_shard_1);
CREATE TABLE trade_history_shard_8 () INHERITS (trade_history_shard_1);

-- Create partitions
CREATE TABLE trade_history_1 PARTITION OF trade_history_shard_1
    FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE trade_history_2 PARTITION OF trade_history_shard_1
    FOR VALUES WITH (MODULUS 8, REMAINDER 1);
CREATE TABLE trade_history_3 PARTITION OF trade_history_shard_1
    FOR VALUES WITH (MODULUS 8, REMAINDER 2);
CREATE TABLE trade_history_4 PARTITION OF trade_history_shard_1
    FOR VALUES WITH (MODULUS 8, REMAINDER 3);
CREATE TABLE trade_history_5 PARTITION OF trade_history_shard_1
    FOR VALUES WITH (MODULUS 8, REMAINDER 4);
CREATE TABLE trade_history_6 PARTITION OF trade_history_shard_1
    FOR VALUES WITH (MODULUS 8, REMAINDER 5);
CREATE TABLE trade_history_7 PARTITION OF trade_history_shard_1
    FOR VALUES WITH (MODULUS 8, REMAINDER 6);
CREATE TABLE trade_history_8 PARTITION OF trade_history_shard_1
    FOR VALUES WITH (MODULUS 8, REMAINDER 7);

-- Arbitrage Opportunities Sharding (by asset_symbol)
CREATE TABLE arbitrage_opportunities_shard_1 (
    opportunity_id BIGINT GENERATED ALWAYS AS IDENTITY,
    asset_symbol TEXT NOT NULL,
    buy_exchange TEXT NOT NULL,
    sell_exchange TEXT NOT NULL,
    buy_price DECIMAL(36,18) NOT NULL,
    sell_price DECIMAL(36,18) NOT NULL,
    spread_percentage DECIMAL(10,6) NOT NULL,
    estimated_profit DECIMAL(36,18) NOT NULL,
    gas_cost_estimate DECIMAL(36,18),
    execution_risk TEXT, -- 'low', 'medium', 'high'
    confidence_score DECIMAL(5,4),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    expiry_time TIMESTAMPTZ,
    status TEXT DEFAULT 'active', -- 'active', 'executed', 'expired', 'cancelled'
    executed_by BIGINT,
    execution_time TIMESTAMPTZ,
    actual_profit DECIMAL(36,18),
    PRIMARY KEY (opportunity_id, asset_symbol)
) PARTITION BY HASH (asset_symbol);

CREATE TABLE arbitrage_opportunities_shard_2 () INHERITS (arbitrage_opportunities_shard_1);
CREATE TABLE arbitrage_opportunities_shard_3 () INHERITS (arbitrage_opportunities_shard_1);
CREATE TABLE arbitrage_opportunities_shard_4 () INHERITS (arbitrage_opportunities_shard_1);

-- Create partitions for arbitrage opportunities
CREATE TABLE arbitrage_opportunities_1 PARTITION OF arbitrage_opportunities_shard_1
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE arbitrage_opportunities_2 PARTITION OF arbitrage_opportunities_shard_1
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE arbitrage_opportunities_3 PARTITION OF arbitrage_opportunities_shard_1
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE arbitrage_opportunities_4 PARTITION OF arbitrage_opportunities_shard_1
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- Price History Sharding (by asset_symbol)
CREATE TABLE price_history_shard_1 (
    price_id BIGINT GENERATED ALWAYS AS IDENTITY,
    asset_symbol TEXT NOT NULL,
    exchange TEXT NOT NULL,
    price DECIMAL(36,18) NOT NULL,
    volume_24h DECIMAL(36,18),
    market_cap DECIMAL(36,18),
    price_change_24h DECIMAL(10,6),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    source TEXT, -- 'websocket', 'api', 'calculated'
    confidence DECIMAL(3,2), -- 0.00 to 1.00
    PRIMARY KEY (price_id, asset_symbol)
) PARTITION BY HASH (asset_symbol);

CREATE TABLE price_history_shard_2 () INHERITS (price_history_shard_1);
CREATE TABLE price_history_shard_3 () INHERITS (price_history_shard_1);
CREATE TABLE price_history_shard_4 () INHERITS (price_history_shard_1);
CREATE TABLE price_history_shard_5 () INHERITS (price_history_shard_1);
CREATE TABLE price_history_shard_6 () INHERITS (price_history_shard_1);

-- Create partitions for price history
CREATE TABLE price_history_1 PARTITION OF price_history_shard_1
    FOR VALUES WITH (MODULUS 6, REMAINDER 0);
CREATE TABLE price_history_2 PARTITION OF price_history_shard_1
    FOR VALUES WITH (MODULUS 6, REMAINDER 1);
CREATE TABLE price_history_3 PARTITION OF price_history_shard_1
    FOR VALUES WITH (MODULUS 6, REMAINDER 2);
CREATE TABLE price_history_4 PARTITION OF price_history_shard_1
    FOR VALUES WITH (MODULUS 6, REMAINDER 3);
CREATE TABLE price_history_5 PARTITION OF price_history_shard_1
    FOR VALUES WITH (MODULUS 6, REMAINDER 4);
CREATE TABLE price_history_6 PARTITION OF price_history_shard_1
    FOR VALUES WITH (MODULUS 6, REMAINDER 5);

-- Risk Metrics Sharding (by user_id)
CREATE TABLE risk_metrics_shard_1 (
    metrics_id BIGINT GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    portfolio_value DECIMAL(36,18) NOT NULL,
    sharpe_ratio DECIMAL(10,6),
    sortino_ratio DECIMAL(10,6),
    beta DECIMAL(10,6),
    max_drawdown DECIMAL(10,6),
    value_at_risk_95 DECIMAL(10,6),
    expected_shortfall_95 DECIMAL(10,6),
    volatility DECIMAL(10,6),
    skewness DECIMAL(10,6),
    kurtosis DECIMAL(10,6),
    correlation_matrix JSONB,
    risk_score DECIMAL(5,4), -- 0.0000 to 1.0000
    risk_level TEXT, -- 'low', 'medium', 'high', 'critical'
    PRIMARY KEY (metrics_id, user_id)
) PARTITION BY HASH (user_id);

CREATE TABLE risk_metrics_shard_2 () INHERITS (risk_metrics_shard_1);
CREATE TABLE risk_metrics_shard_3 () INHERITS (risk_metrics_shard_1);

-- Create partitions for risk metrics
CREATE TABLE risk_metrics_1 PARTITION OF risk_metrics_shard_1
    FOR VALUES WITH (MODULUS 3, REMAINDER 0);
CREATE TABLE risk_metrics_2 PARTITION OF risk_metrics_shard_1
    FOR VALUES WITH (MODULUS 3, REMAINDER 1);
CREATE TABLE risk_metrics_3 PARTITION OF risk_metrics_shard_1
    FOR VALUES WITH (MODULUS 3, REMAINDER 2);

-- Create indexes for performance
CREATE INDEX CONCURRENTLY idx_trade_history_timestamp ON trade_history_shard_1 (timestamp DESC);
CREATE INDEX CONCURRENTLY idx_trade_history_user_asset ON trade_history_shard_1 (user_id, asset_symbol);
CREATE INDEX CONCURRENTLY idx_trade_history_arbitrage ON trade_history_shard_1 (arbitrage_id) WHERE arbitrage_id IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_arbitrage_opportunities_asset_time ON arbitrage_opportunities_shard_1 (asset_symbol, timestamp DESC);
CREATE INDEX CONCURRENTLY idx_arbitrage_opportunities_status ON arbitrage_opportunities_shard_1 (status, timestamp DESC);
CREATE INDEX CONCURRENTLY idx_arbitrage_opportunities_profit ON arbitrage_opportunities_shard_1 (estimated_profit DESC) WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_price_history_asset_time ON price_history_shard_1 (asset_symbol, timestamp DESC);
CREATE INDEX CONCURRENTLY idx_price_history_exchange ON price_history_shard_1 (exchange, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_risk_metrics_user_time ON risk_metrics_shard_1 (user_id, timestamp DESC);
CREATE INDEX CONCURRENTLY idx_risk_metrics_risk_level ON risk_metrics_shard_1 (risk_level, timestamp DESC);

-- Create views for unified access
CREATE VIEW trade_history AS
SELECT * FROM trade_history_shard_1
UNION ALL
SELECT * FROM trade_history_shard_2
UNION ALL
SELECT * FROM trade_history_shard_3
UNION ALL
SELECT * FROM trade_history_shard_4
UNION ALL
SELECT * FROM trade_history_shard_5
UNION ALL
SELECT * FROM trade_history_shard_6
UNION ALL
SELECT * FROM trade_history_shard_7
UNION ALL
SELECT * FROM trade_history_shard_8;

CREATE VIEW arbitrage_opportunities AS
SELECT * FROM arbitrage_opportunities_shard_1
UNION ALL
SELECT * FROM arbitrage_opportunities_shard_2
UNION ALL
SELECT * FROM arbitrage_opportunities_shard_3
UNION ALL
SELECT * FROM arbitrage_opportunities_shard_4;

CREATE VIEW price_history AS
SELECT * FROM price_history_shard_1
UNION ALL
SELECT * FROM price_history_shard_2
UNION ALL
SELECT * FROM price_history_shard_3
UNION ALL
SELECT * FROM price_history_shard_4
UNION ALL
SELECT * FROM price_history_shard_5
UNION ALL
SELECT * FROM price_history_shard_6;

CREATE VIEW risk_metrics AS
SELECT * FROM risk_metrics_shard_1
UNION ALL
SELECT * FROM risk_metrics_shard_2
UNION ALL
SELECT * FROM risk_metrics_shard_3;

-- Insert functions for sharded tables
CREATE OR REPLACE FUNCTION insert_trade_history(
    p_user_id BIGINT,
    p_asset_symbol TEXT,
    p_trade_type TEXT,
    p_quantity DECIMAL,
    p_price DECIMAL,
    p_total_value DECIMAL,
    p_fee DECIMAL DEFAULT 0,
    p_exchange TEXT,
    p_arbitrage_id BIGINT DEFAULT NULL,
    p_profit_loss DECIMAL DEFAULT NULL,
    p_execution_time_ms INTEGER DEFAULT NULL,
    p_gas_used BIGINT DEFAULT NULL,
    p_gas_price DECIMAL DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    v_trade_id BIGINT;
    v_shard_table TEXT;
BEGIN
    -- Get next trade ID
    v_trade_id := nextval('global_trade_id_seq');

    -- Determine shard table
    v_shard_table := 'trade_history_shard_' || get_shard_id(p_user_id, 8)::TEXT;

    -- Insert into appropriate shard
    EXECUTE format('INSERT INTO %I (trade_id, user_id, asset_symbol, trade_type, quantity, price, total_value, fee, exchange, arbitrage_id, profit_loss, execution_time_ms, gas_used, gas_price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
                   v_shard_table)
    USING v_trade_id, p_user_id, p_asset_symbol, p_trade_type, p_quantity, p_price, p_total_value, p_fee, p_exchange, p_arbitrage_id, p_profit_loss, p_execution_time_ms, p_gas_used, p_gas_price;

    RETURN v_trade_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION insert_arbitrage_opportunity(
    p_asset_symbol TEXT,
    p_buy_exchange TEXT,
    p_sell_exchange TEXT,
    p_buy_price DECIMAL,
    p_sell_price DECIMAL,
    p_spread_percentage DECIMAL,
    p_estimated_profit DECIMAL,
    p_gas_cost_estimate DECIMAL DEFAULT NULL,
    p_execution_risk TEXT DEFAULT 'medium',
    p_confidence_score DECIMAL DEFAULT NULL,
    p_expiry_time TIMESTAMPTZ DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    v_opportunity_id BIGINT;
    v_shard_table TEXT;
BEGIN
    -- Determine shard table
    v_shard_table := 'arbitrage_opportunities_shard_' || get_asset_shard(p_asset_symbol, 4)::TEXT;

    -- Insert into appropriate shard and get ID
    EXECUTE format('INSERT INTO %I (asset_symbol, buy_exchange, sell_exchange, buy_price, sell_price, spread_percentage, estimated_profit, gas_cost_estimate, execution_risk, confidence_score, expiry_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING opportunity_id',
                   v_shard_table)
    INTO v_opportunity_id
    USING p_asset_symbol, p_buy_exchange, p_sell_exchange, p_buy_price, p_sell_price, p_spread_percentage, p_estimated_profit, p_gas_cost_estimate, p_execution_risk, p_confidence_score, p_expiry_time;

    RETURN v_opportunity_id;
END;
$$ LANGUAGE plpgsql;

-- Performance monitoring views
CREATE VIEW shard_performance AS
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_live_tup,
    n_dead_tup,
    last_autoanalyze,
    last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%shard%'
ORDER BY n_live_tup DESC;

-- Sharding health check function
CREATE OR REPLACE FUNCTION check_shard_balance()
RETURNS TABLE(shard_table TEXT, record_count BIGINT, percentage DECIMAL) AS $$
DECLARE
    total_records BIGINT;
BEGIN
    -- Calculate total records across all shards
    SELECT SUM(n_live_tup) INTO total_records
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND tablename LIKE '%shard%';

    RETURN QUERY
    SELECT
        t.tablename::TEXT,
        t.n_live_tup,
        ROUND((t.n_live_tup::DECIMAL / NULLIF(total_records, 0)) * 100, 2)
    FROM pg_stat_user_tables t
    WHERE t.schemaname = 'public'
      AND t.tablename LIKE '%shard%'
    ORDER BY t.n_live_tup DESC;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE trade_history_shard_1 IS 'Sharded trade history table - distributes by user_id across 8 shards';
COMMENT ON TABLE arbitrage_opportunities_shard_1 IS 'Sharded arbitrage opportunities - distributes by asset_symbol across 4 shards';
COMMENT ON TABLE price_history_shard_1 IS 'Sharded price history - distributes by asset_symbol across 6 shards';
COMMENT ON TABLE risk_metrics_shard_1 IS 'Sharded risk metrics - distributes by user_id across 3 shards';

COMMENT ON FUNCTION get_shard_id IS 'Calculates shard ID based on user_id for even distribution';
COMMENT ON FUNCTION get_asset_shard IS 'Calculates shard ID based on asset_symbol hash for consistent routing';
COMMENT ON FUNCTION insert_trade_history IS 'Inserts trade record into appropriate shard based on user_id';
COMMENT ON FUNCTION insert_arbitrage_opportunity IS 'Inserts arbitrage opportunity into appropriate shard based on asset_symbol';
COMMENT ON FUNCTION check_shard_balance IS 'Returns shard distribution statistics for monitoring';

-- Grant permissions (adjust as needed for your application)
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO alpha_orion_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO alpha_orion_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO alpha_orion_app;
