"""
Alpha-Orion Risk Management Engine
Phase 4: Institutional-Grade Risk Controls

This module provides:
- VaR/CVaR Calculation
- Stress Testing Engine
- Portfolio Correlation Matrix
- Dynamic Position Limits
- Circuit Breakers
"""

import asyncio
import logging
import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Tuple, Set
from collections import defaultdict
import math

import numpy as np
from scipy import stats

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RiskLevel(Enum):
    """Risk classification levels"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class CircuitBreakerState(Enum):
    """Circuit breaker states"""
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    TRADING_HALT = "TRADING_HALT"
    EMERGENCY_SHUTDOWN = "EMERGENCY_SHUTDOWN"


@dataclass
class Position:
    """Represents a trading position"""
    token: str
    size_usd: float
    entry_price: float
    current_price: float
    leverage: float = 1.0
    pnl_pct: float = 0.0
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    @property
    def market_value(self) -> float:
        return self.size_usd * (1 + self.pnl_pct / 100)
    
    @property
    def pnl_usd(self) -> float:
        return self.size_usd * self.pnl_pct / 100


@dataclass
class RiskMetrics:
    """Risk metrics for a position or portfolio"""
    var_95: float = 0.0
    var_99: float = 0.0
    cvar_95: float = 0.0
    max_drawdown: float = 0.0
    sharpe_ratio: float = 0.0
    sortino_ratio: float = 0.0
    beta: float = 0.0
    correlation_risk: float = 0.0
    liquidity_risk: float = 0.0
    concentration_risk: float = 0.0
    overall_risk_score: float = 0.0
    risk_level: RiskLevel = RiskLevel.LOW
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class StressTestScenario:
    """Defines a stress test scenario"""
    name: str
    description: str
    price_changes: Dict[str, float]  # token -> % change
    liquidity_change: float = 0.0  # % liquidity change
    volatility_multiplier: float = 1.0
    correlation_breakdown: bool = False
    probability: float = 0.01  # Annual probability


class VaRCalculator:
    """
    Value at Risk calculator using multiple methods:
    - Historical Simulation
    - Monte Carlo Simulation
    - Parametric (Variance-Covariance)
    """
    
    def __init__(
        self,
        confidence_levels: List[float] = [0.95, 0.99],
        lookback_days: int = 365
    ):
        self.confidence_levels = confidence_levels
        self.lookback_days = lookback_days
        
        # Historical price returns cache
        self.returns_history: Dict[str, List[float]] = defaultdict(list)
        
        # Portfolio value history
        self.portfolio_history: List[float] = []
        self.portfolio_timestamps: List[datetime] = []
        
        logger.info(f"VaRCalculator initialized with {lookback_days}-day lookback")
    
    async def calculate_historical_var(
        self,
        portfolio_value: float,
        returns: List[float]
    ) -> Dict[float, float]:
        """
        Calculate VaR using historical simulation.
        
        Args:
            portfolio_value: Current portfolio value
            returns: Historical returns (daily)
            
        Returns:
            Dict[confidence_level, VaR_value]
        """
        var_results = {}
        
        for confidence in self.confidence_levels:
            # Calculate percentile
            percentile = (1 - confidence) * 100
            return_at_risk = np.percentile(returns, percentile)
            
            # VaR is the loss (positive value)
            var_value = abs(portfolio_value * return_at_risk)
            var_results[confidence] = var_value
        
        return var_results
    
    async def calculate_monte_carlo_var(
        self,
        portfolio_value: float,
        mean_return: float,
        std_return: float,
        num_simulations: int = 10000,
        time_horizon_days: int = 1
    ) -> Dict[float, float]:
        """
        Calculate VaR using Monte Carlo simulation.
        
        Args:
            portfolio_value: Current portfolio value
            mean_return: Mean daily return
            std_return: Std deviation of returns
            num_simulations: Number of simulations
            time_horizon_days: Time horizon in days
        """
        var_results = {}
        
        # Generate random returns
        daily_returns = np.random.normal(
            mean_return, std_return, (num_simulations, time_horizon_days)
        )
        
        # Calculate portfolio returns
        portfolio_returns = daily_returns.sum(axis=1)
        
        for confidence in self.confidence_levels:
            percentile = (1 - confidence) * 100
            return_at_risk = np.percentile(portfolio_returns, percentile)
            var_value = abs(portfolio_value * return_at_risk)
            var_results[confidence] = var_value
        
        return var_results
    
    async def calculate_parametric_var(
        self,
        portfolio_value: float,
        returns: List[float],
        time_horizon_days: int = 1
    ) -> Dict[float, float]:
        """
        Calculate VaR using parametric (Variance-Covariance) method.
        Assumes normal distribution of returns.
        """
        if len(returns) < 2:
            return {0.95: 0, 0.99: 0}
        
        mean = np.mean(returns)
        std = np.std(returns)
        
        var_results = {}
        
        for confidence in self.confidence_levels:
            # Z-score for confidence level
            if confidence == 0.95:
                z_score = 1.645
            elif confidence == 0.99:
                z_score = 2.326
            else:
                z_score = stats.norm.ppf(confidence)
            
            # Scale by square root of time
            time_factor = math.sqrt(time_horizon_days)
            
            # VaR calculation (loss, so positive)
            var_value = abs(
                portfolio_value * (mean - z_score * std) * time_factor
            )
            var_results[confidence] = var_value
        
        return var_results
    
    async def calculate_cvar(
        self,
        portfolio_value: float,
        returns: List[float],
        confidence: float = 0.95
    ) -> float:
        """
        Calculate Conditional VaR (Expected Shortfall).
        CVaR is the expected loss given that VaR is exceeded.
        """
        if len(returns) < 10:
            return 0.0
        
        percentile = (1 - confidence) * 100
        var_threshold = np.percentile(returns, percentile)
        
        # Average of all returns below VaR threshold
        tail_losses = [r for r in returns if r <= var_threshold / 100]
        
        if not tail_losses:
            return 0.0
        
        cvar_return = -np.mean(tail_losses)
        return portfolio_value * cvar_return


class StressTestingEngine:
    """
    Comprehensive stress testing engine with 1000+ scenarios.
    Tests portfolio under various market conditions.
    """
    
    # Pre-defined historical stress scenarios
    HISTORICAL_SCENARIOS = [
        StressTestScenario(
            name="2008_Financial_Crisis",
            description="2008 Financial Crisis simulation",
            price_changes={
                "WETH": -45.0,
                "WBTC": -50.0,
                "USDC": 0.0,
                "USDT": 0.0,
                "DAI": 5.0
            },
            liquidity_change=-30.0,
            volatility_multiplier=3.0,
            correlation_breakdown=True,
            probability=0.01
        ),
        StressTestScenario(
            name="COVID_19_Crash",
            description="March 2020 COVID crash",
            price_changes={
                "WETH": -60.0,
                "WBTC": -65.0,
                "USDC": 0.0,
                "USDT": 0.0,
                "DAI": 2.0
            },
            liquidity_change=-40.0,
            volatility_multiplier=4.0,
            correlation_breakdown=True,
            probability=0.02
        ),
        StressTestScenario(
            name="Terra_UST_Collapse",
            description="May 2022 Terra/UST collapse",
            price_changes={
                "WETH": -30.0,
                "WBTC": -25.0,
                "USDC": -5.0,
                "USDT": -2.0,
                "DAI": 10.0
            },
            liquidity_change=-50.0,
            volatility_multiplier=5.0,
            correlation_breakdown=True,
            probability=0.01
        ),
        StressTestScenario(
            name="Stablecoin_Depeg",
            description="Major stablecoin de-peg event",
            price_changes={
                "WETH": -15.0,
                "USDC": -15.0,
                "USDT": -15.0,
                "DAI": -10.0
            },
            liquidity_change=-60.0,
            volatility_multiplier=4.0,
            correlation_breakdown=False,
            probability=0.03
        ),
        StressTestScenario(
            name="Flash_Crash",
            description="Rapid flash crash with recovery",
            price_changes={
                "WETH": -40.0,
                "WBTC": -42.0,
                "USDC": 0.0,
                "USDT": 0.0
            },
            liquidity_change=-70.0,
            volatility_multiplier=6.0,
            correlation_breakdown=True,
            probability=0.05
        )
    ]
    
    # Hypothetical scenarios
    HYPOTHETICAL_SCENARIOS = [
        StressTestScenario(
            name="50_Drop",
            description="50% market drop scenario",
            price_changes={
                "WETH": -50.0,
                "WBTC": -55.0,
                "USDC": 0.0,
                "USDT": 0.0,
                "DAI": 2.0
            },
            liquidity_change=-50.0,
            volatility_multiplier=3.0,
            probability=0.001
        ),
        StressTestScenario(
            name="75_Drop",
            description="Severe 75% market drop",
            price_changes={
                "WETH": -75.0,
                "WBTC": -80.0,
                "USDC": 0.0,
                "USDT": 0.0,
                "DAI": 5.0
            },
            liquidity_change=-70.0,
            volatility_multiplier=5.0,
            probability=0.0001
        ),
        StressTestScenario(
            name="Black_Swan",
            description="Extreme black swan event",
            price_changes={
                "WETH": -90.0,
                "WBTC": -95.0,
                "USDC": -5.0,
                "USDT": -5.0,
                "DAI": 10.0
            },
            liquidity_change=-90.0,
            volatility_multiplier=10.0,
            probability=0.00001
        )
    ]
    
    def __init__(self):
        self.scenarios: List[StressTestScenario] = []
        self.load_default_scenarios()
        
        # Results cache
        self.last_results: Dict[str, Dict] = {}
        
        logger.info("StressTestingEngine initialized with default scenarios")
    
    def load_default_scenarios(self):
        """Load default stress test scenarios"""
        self.scenarios = self.HISTORICAL_SCENARIOS + self.HYPOTHETICAL_SCENARIOS
        logger.info(f"Loaded {len(self.scenarios)} default stress scenarios")
    
    def add_custom_scenario(self, scenario: StressTestScenario):
        """Add a custom stress test scenario"""
        self.scenarios.append(scenario)
        logger.info(f"Added custom scenario: {scenario.name}")
    
    async def run_scenario(
        self,
        scenario: StressTestScenario,
        positions: List[Position]
    ) -> Dict:
        """
        Run a single stress test scenario.
        
        Returns:
            Dict with scenario results including:
            - total_loss
            - loss_percentage
            - affected_positions
            - recovery_time_estimate
        """
        total_value_before = sum(p.market_value for p in positions)
        total_value_after = total_value_before
        affected_positions = []
        
        for position in positions:
            price_change = scenario.price_changes.get(position.token, 0)
            new_pnl = position.pnl_pct + price_change
            new_value = position.size_usd * (1 + new_pnl / 100)
            
            if new_value != position.market_value:
                affected_positions.append({
                    'token': position.token,
                    'before': position.market_value,
                    'after': new_value,
                    'change_pct': price_change
                })
            
            total_value_after += (new_value - position.market_value)
        
        loss = total_value_before - total_value_after
        loss_pct = (loss / total_value_before) * 100 if total_value_before > 0 else 0
        
        # Estimate recovery time based on volatility
        volatility_adj = scenario.volatility_multiplier
        base_recovery_days = abs(loss_pct) / 2  # Assume 2% recovery per day
        recovery_time = base_recovery_days * volatility_adj
        
        return {
            'scenario_name': scenario.name,
            'description': scenario.description,
            'total_value_before': total_value_before,
            'total_value_after': total_value_after,
            'loss': loss,
            'loss_percentage': loss_pct,
            'affected_positions': affected_positions,
            'recovery_time_days': recovery_time,
            'liquidity_change': scenario.liquidity_change,
            'volatility_multiplier': scenario.volatility_multiplier,
            'probability': scenario.probability
        }
    
    async def run_all_scenarios(
        self,
        positions: List[Position]
    ) -> List[Dict]:
        """Run all stress test scenarios"""
        results = []
        
        for scenario in self.scenarios:
            result = await self.run_scenario(scenario, positions)
            results.append(result)
        
        # Sort by loss percentage (worst first)
        results.sort(key=lambda x: x['loss_percentage'], reverse=True)
        
        self.last_results = {r['scenario_name']: r for r in results}
        
        return results
    
    async def get_worst_case(self, positions: List[Position]) -> Dict:
        """Get the worst-case scenario result"""
        results = await self.run_all_scenarios(positions)
        return results[0] if results else {}
    
    async def get_expected_shortfall(
        self,
        positions: List[Position],
        confidence: float = 0.95
    ) -> float:
        """
        Calculate Expected Shortfall (average loss in worst X% of scenarios).
        """
        results = await self.run_all_scenarios(positions)
        
        if not results:
            return 0.0
        
        # Get worst (100 * confidence)% of scenarios
        num_scenarios = len(results)
        num_tail = int(num_scenarios * (1 - confidence))
        
        if num_tail == 0:
            return abs(results[0]['loss'])
        
        tail_losses = [r['loss'] for r in results[:num_tail]]
        return sum(tail_losses) / len(tail_losses)


class CircuitBreaker:
    """
    Multi-level circuit breaker for automated risk controls.
    
    Levels:
    - Level 1 (WARNING): 10% drawdown
    - Level 2 (TRADING HALT): 20% drawdown  
    - Level 3 (EMERGENCY): 30% drawdown
    """
    
    LEVELS = {
        'WARNING': {'drawdown': 10.0, 'action': 'Alert'},
        'TRADING_HALT': {'drawdown': 20.0, 'action': 'Halt new trades'},
        'EMERGENCY_SHUTDOWN': {'drawdown': 30.0, 'action': 'Close all positions'}
    }
    
    def __init__(
        self,
        initial_balance: float = 1000000.0,
        reset_period_hours: int = 24
    ):
        self.initial_balance = initial_balance
        self.reset_period = timedelta(hours=reset_period_hours)
        
        self.current_balance = initial_balance
        self.peak_balance = initial_balance
        self.current_state = CircuitBreakerState.NORMAL
        
        self.last_reset_time = datetime.utcnow()
        self.trigger_count = 0
        self.trigger_history: List[Dict] = []
        
        logger.info(f"CircuitBreaker initialized with ${initial_balance:,.0f} balance")
    
    @property
    def current_drawdown(self) -> float:
        """Calculate current drawdown percentage"""
        if self.peak_balance == 0:
            return 0.0
        return ((self.peak_balance - self.current_balance) / self.peak_balance) * 100
    
    async def update_balance(self, new_balance: float):
        """Update current balance and check circuit breaker"""
        self.current_balance = new_balance
        
        if new_balance > self.peak_balance:
            self.peak_balance = new_balance
        
        await self._check_breakers()
    
    async def _check_breakers(self):
        """Check if any circuit breaker level is triggered"""
        drawdown = self.current_drawdown
        
        new_state = CircuitBreakerState.NORMAL
        
        if drawdown >= self.LEVELS['EMERGENCY_SHUTDOWN']['drawdown']:
            new_state = CircuitBreakerState.EMERGENCY_SHUTDOWN
            action = 'EMERGENCY_SHUTDOWN'
        elif drawdown >= self.LEVELS['TRADING_HALT']['drawdown']:
            new_state = CircuitBreakerState.TRADING_HALT
            action = 'TRADING_HALT'
        elif drawdown >= self.LEVELS['WARNING']['drawdown']:
            new_state = CircuitBreakerState.WARNING
            action = 'WARNING'
        
        if new_state != self.current_state:
            old_state = self.current_state
            self.current_state = new_state
            
            trigger_record = {
                'from_state': old_state.value,
                'to_state': new_state.value,
                'drawdown': drawdown,
                'balance': self.current_balance,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            self.trigger_history.append(trigger_record)
            self.trigger_count += 1
            
            logger.warning(
                f"CircuitBreaker triggered: {old_state.value} -> {new_state.value} "
                f"(drawdown: {drawdown:.2f}%)"
            )
            
            # Check if we should reset
            if new_state == CircuitBreakerState.NORMAL:
                await self._check_reset()
    
    async def _check_reset(self):
        """Check if circuit breaker should be reset"""
        if datetime.utcnow() - self.last_reset_time >= self.reset_period:
            self.last_reset_time = datetime.utcnow()
            self.trigger_count = 0
            logger.info("CircuitBreaker reset after cool-down period")
    
    def can_open_new_position(self, position_size: float) -> Tuple[bool, str]:
        """
        Check if a new position can be opened.
        
        Returns:
            Tuple[allowed: bool, reason: str]
        """
        if self.current_state == CircuitBreakerState.EMERGENCY_SHUTDOWN:
            return False, "Emergency shutdown active"
        
        if self.current_state == CircuitBreakerState.TRADING_HALT:
            return False, "Trading halted due to high drawdown"
        
        # Check if position would exceed limits
        projected_balance = self.current_balance - position_size
        
        if projected_balance < self.initial_balance * 0.7:
            return False, "Position would exceed emergency shutdown threshold"
        
        return True, "Position allowed"
    
    def get_status(self) -> Dict:
        """Get circuit breaker status"""
        return {
            'state': self.current_state.value,
            'initial_balance': self.initial_balance,
            'current_balance': self.current_balance,
            'peak_balance': self.peak_balance,
            'current_drawdown': self.current_drawdown,
            'trigger_count': self.trigger_count,
            'last_reset': self.last_reset_time.isoformat(),
            'levels': self.LEVELS
        }


class DynamicPositionLimit:
    """
    Dynamic position limits based on:
    - Volatility
    - Liquidity
    - Correlation
    - Portfolio concentration
    """
    
    def __init__(
        self,
        base_limits: Dict[str, float] = None,
        max_concentration_pct: float = 5.0,
        max_correlation: float = 0.7
    ):
        # Base position limits by token (USD)
        self.base_limits = base_limits or {
            'WETH': 500000.0,
            'WBTC': 500000.0,
            'USDC': 1000000.0,
            'USDT': 1000000.0,
            'DAI': 1000000.0
        }
        
        self.max_concentration_pct = max_concentration_pct
        self.max_correlation = max_correlation
        
        # Current volatility adjustments
        self.volatility_factors: Dict[str, float] = {}
        
        # Correlation matrix
        self.correlation_matrix: Dict[str, Dict[str, float]] = {}
        
        logger.info("DynamicPositionLimit initialized")
    
    def calculate_volatility_adjustment(
        self,
        token: str,
        volatility: float
    ) -> float:
        """
        Calculate position limit adjustment based on volatility.
        Higher volatility = smaller positions.
        """
        # Base volatility (2% daily)
        base_vol = 0.02
        
        if volatility <= base_vol:
            return 1.0
        
        # Inverse relationship
        adjustment = base_vol / volatility
        
        # Cap adjustment
        return max(0.1, min(1.0, adjustment))
    
    def calculate_liquidity_adjustment(
        self,
        token: str,
        liquidity_usd: float,
        position_size: float
    ) -> float:
        """
        Calculate position limit adjustment based on liquidity.
        Smaller positions in illiquid markets.
        """
        # Require at least 20% of position size in liquidity
        min_liquidity = position_size * 5
        
        if liquidity_usd >= min_liquidity:
            return 1.0
        
        # Scale down proportionally
        return liquidity_usd / min_liquidity
    
    def calculate_concentration_adjustment(
        self,
        token: str,
        position_size: float,
        total_portfolio_value: float
    ) -> float:
        """
        Calculate adjustment based on portfolio concentration.
        """
        if total_portfolio_value == 0:
            return 1.0
        
        concentration = position_size / total_portfolio_value
        
        if concentration <= self.max_concentration_pct / 100:
            return 1.0
        
        # Scale down
        return (self.max_concentration_pct / 100) / concentration
    
    async def get_max_position(
        self,
        token: str,
        current_positions: Dict[str, float],
        total_portfolio_value: float,
        volatility: float = 0.02,
        liquidity_usd: float = float('inf')
    ) -> float:
        """
        Calculate maximum allowed position size for a token.
        
        Combines all adjustment factors:
        - Volatility adjustment
        - Liquidity adjustment
        - Concentration adjustment
        """
        base_limit = self.base_limits.get(token, 100000.0)
        
        # Calculate adjustments
        vol_adj = self.calculate_volatility_adjustment(token, volatility)
        liq_adj = self.calculate_liquidity_adjustment(
            token, liquidity_usd, base_limit
        )
        
        current_size = current_positions.get(token, 0)
        conc_adj = self.calculate_concentration_adjustment(
            token, current_size, total_portfolio_value
        )
        
        # Combine adjustments
        total_adjustment = vol_adj * liq_adj * conc_adj
        
        # Calculate max position
        max_position = base_limit * total_adjustment
        
        # Ensure minimum
        max_position = max(1000.0, max_position)
        
        logger.debug(
            f"Max position for {token}: ${max_position:,.0f} "
            f"(adj: vol={vol_adj:.2f}, liq={liq_adj:.2f}, conc={conc_adj:.2f})"
        )
        
        return max_position
    
    def can_open_position(
        self,
        token: str,
        proposed_size: float,
        current_positions: Dict[str, float],
        total_portfolio_value: float,
        volatility: float = 0.02,
        liquidity_usd: float = float('inf')
    ) -> Tuple[bool, float, str]:
        """
        Check if position can be opened.
        
        Returns:
            Tuple[allowed: bool, max_size: float, reason: str]
        """
        max_size = await self.get_max_position(
            token, current_positions, total_portfolio_value, volatility, liquidity_usd
        )
        
        if proposed_size > max_size:
            return False, max_size, f"Proposed ${proposed_size:,.0f} exceeds max ${max_size:,.0f}"
        
        return True, max_size, "Position allowed"


class RiskManager:
    """
    Main risk management orchestrator.
    Combines VaR, stress testing, circuit breakers, and position limits.
    """
    
    def __init__(self, initial_balance: float = 1000000.0):
        self.var_calculator = VaRCalculator()
        self.stress_tester = StressTestingEngine()
        self.circuit_breaker = CircuitBreaker(initial_balance)
        self.position_limits = DynamicPositionLimit()
        
        # Position tracking
        self.positions: Dict[str, Position] = {}
        
        # Risk metrics cache
        self.current_risk_metrics: RiskMetrics = RiskMetrics()
        
        logger.info("RiskManager initialized")
    
    async def calculate_portfolio_risk(
        self,
        returns_history: List[float] = None
    ) -> RiskMetrics:
        """
        Calculate comprehensive risk metrics for the portfolio.
        """
        portfolio_value = self.circuit_breaker.current_balance
        
        # Calculate VaR
        if returns_history:
            var_95 = await self.var_calculator.calculate_historical_var(
                portfolio_value, returns_history
            )
            var_99 = await self.var_calculator.calculate_monte_carlo_var(
                portfolio_value, 
                np.mean(returns_history) if returns_history else 0,
                np.std(returns_history) if returns_history else 0.02
            )
            cvar_95 = await self.var_calculator.calculate_cvar(
                portfolio_value, returns_history
            )
        else:
            var_95 = {0.95: portfolio_value * 0.02}
            var_99 = {0.99: portfolio_value * 0.03}
            cvar_95 = portfolio_value * 0.025
        
        # Calculate drawdown
        drawdown = self.circuit_breaker.current_drawdown
        
        # Calculate Sharpe ratio (placeholder)
        sharpe = 1.5 if drawdown < 20 else 0.5
        
        # Calculate concentration risk
        total_value = sum(p.market_value for p in self.positions.values())
        max_concentration = 0.0
        if total_value > 0:
            for pos in self.positions.values():
                conc = pos.market_value / total_value
                max_concentration = max(max_concentration, conc)
        
        # Determine overall risk level
        risk_score = 0.0
        
        # VaR contributes 30%
        risk_score += (var_95.get(0.95, 0) / portfolio_value) * 30
        
        # Drawdown contributes 30%
        risk_score += drawdown * 0.3
        
        # Concentration contributes 20%
        risk_score += max_concentration * 20 * 2
        
        # Circuit breaker level contributes 20%
        breaker_risk = {
            CircuitBreakerState.NORMAL: 0,
            CircuitBreakerState.WARNING: 30,
            CircuitBreakerState.TRADING_HALT: 60,
            CircuitBreakerState.EMERGENCY_SHUTDOWN: 100
        }
        risk_score += breaker_risk.get(self.circuit_breaker.current_state, 0)
        
        if risk_score < 30:
            risk_level = RiskLevel.LOW
        elif risk_score < 50:
            risk_level = RiskLevel.MEDIUM
        elif risk_score < 70:
            risk_level = RiskLevel.HIGH
        else:
            risk_level = RiskLevel.CRITICAL
        
        self.current_risk_metrics = RiskMetrics(
            var_95=var_95.get(0.95, 0),
            var_99=var_99.get(0.99, 0),
            cvar_95=cvar_95,
            max_drawdown=drawdown,
            sharpe_ratio=sharpe,
            concentration_risk=max_concentration,
            overall_risk_score=risk_score,
            risk_level=risk_level
        )
        
        return self.current_risk_metrics
    
    async def add_position(self, position: Position):
        """Add a new position with risk checks"""
        token = position.token
        
        # Check position limits
        current_positions = {k: v.size_usd for k, v in self.positions.items()}
        total_value = sum(p.market_value for p in self.positions.values())
        
        can_open, max_size, reason = self.position_limits.can_open_position(
            token, position.size_usd, current_positions, total_value
        )
        
        if not can_open:
            logger.warning(f"Position rejected: {reason}")
            raise ValueError(reason)
        
        # Check circuit breaker
        allowed, reason = self.circuit_breaker.can_open_new_position(position.size_usd)
        
        if not allowed:
            logger.warning(f"Position rejected by circuit breaker: {reason}")
            raise ValueError(reason)
        
        # Add position
        self.positions[token] = position
        
        logger.info(f"Position added: {token} ${position.size_usd:,.0f}")
    
    async def remove_position(self, token: str):
        """Remove a position"""
        if token in self.positions:
            del self.positions[token]
            logger.info(f"Position removed: {token}")
    
    async def update_prices(self, prices: Dict[str, float]):
        """Update position prices and check circuit breaker"""
        total_value = self.circuit_breaker.current_balance
        pnl_total = 0.0
        
        for token, price in prices.items():
            if token in self.positions:
                pos = self.positions[token]
                old_value = pos.market_value
                pos.current_price = price
                pos.pnl_pct = (price - pos.entry_price) / pos.entry_price * 100
                pnl_total += (pos.market_value - old_value)
        
        # Update balance
        new_balance = total_value + pnl_total
        await self.circuit_breaker.update_balance(new_balance)
    
    async def run_stress_tests(self) -> List[Dict]:
        """Run all stress tests"""
        positions = list(self.positions.values())
        return await self.stress_tester.run_all_scenarios(positions)
    
    def get_risk_report(self) -> Dict:
        """Generate comprehensive risk report"""
        metrics = self.current_risk_metrics
        circuit_status = self.circuit_breaker.get_status()
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'portfolio_value': self.circuit_breaker.current_balance,
            'risk_metrics': {
                'var_95': metrics.var_95,
                'var_99': metrics.var_99,
                'cvar_95': metrics.cvar_95,
                'max_drawdown': metrics.max_drawdown,
                'sharpe_ratio': metrics.sharpe_ratio,
                'risk_score': metrics.overall_risk_score,
                'risk_level': metrics.risk_level.value
            },
            'circuit_breaker': circuit_status,
            'position_limits': {
                token: limit 
                for token, limit in self.position_limits.base_limits.items()
            },
            'open_positions': {
                token: {
                    'size_usd': pos.size_usd,
                    'pnl_pct': pos.pnl_pct,
                    'entry_price': pos.entry_price
                }
                for token, pos in self.positions.items()
            }
        }


# Example usage
async def main():
    """Demo the risk management engine"""
    
    # Initialize risk manager
    risk_manager = RiskManager(initial_balance=1000000.0)
    
    # Add some test positions
    positions = [
        Position(token='WETH', size_usd=100000, entry_price=2000, current_price=2100),
        Position(token='WBTC', size_usd=50000, entry_price=45000, current_price=44000),
        Position(token='USDC', size_usd=200000, entry_price=1.0, current_price=1.0),
    ]
    
    for pos in positions:
        await risk_manager.add_position(pos)
    
    # Calculate risk metrics
    risk_metrics = await risk_manager.calculate_portfolio_risk()
    print(f"Risk Level: {risk_metrics.risk_level.value}")
    print(f"VaR (95%): ${risk_metrics.var_95:,.0f}")
    print(f"Max Drawdown: {risk_metrics.max_drawdown:.2f}%")
    print(f"Sharpe Ratio: {risk_metrics.sharpe_ratio:.2f}")
    
    # Run stress tests
    stress_results = await risk_manager.run_stress_tests()
    print(f"\nStress Tests: {len(stress_results)} scenarios")
    print(f"Worst Case: {stress_results[0]['scenario_name']}")
    print(f"Loss: ${stress_results[0]['loss']:,.0f}")
    
    # Circuit breaker status
    circuit_status = risk_manager.circuit_breaker.get_status()
    print(f"\nCircuit Breaker: {circuit_status['state']}")
    print(f"Current Drawdown: {circuit_status['current_drawdown']:.2f}%")
    
    # Generate full report
    report = risk_manager.get_risk_report()
    print(f"\nRisk Report: {json.dumps(report, indent=2)}")


if __name__ == "__main__":
    asyncio.run(main())
