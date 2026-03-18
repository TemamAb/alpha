import logging

logger = logging.getLogger(__name__)

MAX_SLIPPAGE_PCT = 0.005  # 0.5%
MIN_LIQUIDITY_RATIO = 0.1  # 10% of pool
MIN_PROFIT_USD = 10  # USD equivalent
IMPERMANENT_LOSS_THRESHOLD = 0.02  # 2%

def check_slippage(expected_price, actual_price, max_pct=None):
    """
    Check if slippage exceeds threshold.
    Returns True if safe (low slippage).
    """
    if max_pct is None:
        max_pct = MAX_SLIPPAGE_PCT
    
    slippage = abs(actual_price - expected_price) / expected_price
    safe = slippage <= max_pct
    if not safe:
        logger.warning(f"High slippage: {slippage*100:.2f}% > {max_pct*100:.2f}%")
    return safe

def check_liquidity(amount_needed, pool_size, ratio=None):
    """
    Check if pool has enough liquidity for trade.
    amount_needed: tokens required
    pool_size: total pool liquidity
    """
    if ratio is None:
        ratio = MIN_LIQUIDITY_RATIO
    
    has_liquidity = amount_needed <= pool_size * ratio
    if not has_liquidity:
        logger.warning(f"Low liquidity ratio: {amount_needed/pool_size:.2f} > {ratio}")
    return has_liquidity

def check_profit_threshold(gross_profit, fees, min_usd=None):
    """
    Verify net profit exceeds threshold.
    """
    if min_usd is None:
        min_usd = MIN_PROFIT_USD
    net_profit_usd = gross_profit - fees  # Assume USD normalized
    return net_profit_usd >= min_usd

def check_impermanent_loss(base_price, current_price, threshold=None):
    """
    Basic IL check for LP positions (if used).
    """
    if threshold is None:
        threshold = IMPERMANENT_LOSS_THRESHOLD
    il = abs(current_price - base_price) / base_price
    return il <= threshold

def full_risk_assessment(opportunity, current_prices, liquidity_data):
    """
    Comprehensive risk check combining all checks.
    Returns (safe: bool, risks: list)
    """
    risks = []
    
    # Slippage
    if not check_slippage(current_prices.get(opportunity['buy_dex'], 1.0), 
                         current_prices.get(opportunity['sell_dex'], 1.0)):
        risks.append("high_slippage")
    
    # Liquidity
    if not check_liquidity(opportunity.get('amount', opportunity['profit'] * 10),  
                          liquidity_data.get(opportunity['token'], 0)):
        risks.append("low_liquidity")
    
    # Profit
    if not check_profit_threshold(opportunity['profit'], opportunity.get('fees', 0)):
        risks.append("low_profit")
    
    safe = len(risks) == 0
    logger.info(f"Risk assessment: safe={safe}, risks={risks}")
    return safe, risks
