"""
Gamma Scalping Manager for Alpha-Orion
Implements gamma scalping strategies for delta-neutral options trading

Version: 1.0
Date: February 15, 2026
"""

import asyncio
import logging
import time
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import numpy as np
from scipy.stats import norm

@dataclass
class GammaScalpingPosition:
    """Gamma scalping position"""
    option_address: str
    underlying_asset: str
    position_size: float  # Number of contracts
    delta: float
    gamma: float
    current_price: float
    entry_price: float
    unrealized_pnl: float
    hedge_ratio: float
    last_hedge_time: float
    timestamp: float

@dataclass
class GammaScalpingSignal:
    """Gamma scalping trading signal"""
    action: str  # 'hedge', 'close', 'adjust'
    option_address: str
    underlying_asset: str
    hedge_quantity: float
    expected_pnl_impact: float
    confidence: float
    reason: str
    timestamp: float

class GammaScalpingManager:
    """Manager for gamma scalping strategies"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

        # Position tracking
        self.positions: Dict[str, GammaScalpingPosition] = {}

        # Gamma scalping parameters
        self.gamma_threshold = 0.1  # Minimum gamma for scalping
        self.delta_threshold = 0.05  # Delta tolerance for neutrality
        self.hedge_frequency = 300  # Hedge every 5 minutes
        self.max_position_size = 100  # Maximum contracts per position

        # Risk parameters
        self.max_gamma_exposure = 50  # Maximum total gamma exposure
        self.max_delta_exposure = 10  # Maximum total delta exposure

    async def scan_gamma_scalping_opportunities(self) -> List[GammaScalpingSignal]:
        """
        Scan for gamma scalping opportunities
        """
        try:
            signals = []

            # Check existing positions for hedging needs
            for option_address, position in self.positions.items():
                hedge_signal = await self._check_position_hedging_needs(position)
                if hedge_signal:
                    signals.append(hedge_signal)

            # Look for new gamma scalping positions
            new_positions = await self._find_gamma_scalping_candidates()
            for position in new_positions:
                signals.append(GammaScalpingSignal(
                    action='open',
                    option_address=position['option_address'],
                    underlying_asset=position['underlying_asset'],
                    hedge_quantity=0,  # Will be calculated when opening
                    expected_pnl_impact=position['expected_daily_premium'],
                    confidence=position['confidence'],
                    reason='High gamma with favorable risk/reward',
                    timestamp=time.time()
                ))

            # Sort by expected impact
            signals.sort(key=lambda x: abs(x.expected_pnl_impact), reverse=True)

            self.logger.info(f"Generated {len(signals)} gamma scalping signals")
            return signals

        except Exception as e:
            self.logger.error(f"Error scanning gamma scalping opportunities: {e}")
            return []

    async def _check_position_hedging_needs(self, position: GammaScalpingPosition) -> Optional[GammaScalpingSignal]:
        """
        Check if a position needs hedging
        """
        try:
            current_time = time.time()

            # Check if enough time has passed since last hedge
            if current_time - position.last_hedge_time < self.hedge_frequency:
                return None

            # Check delta neutrality
            if abs(position.delta) > self.delta_threshold:
                hedge_quantity = -position.delta * position.position_size

                return GammaScalpingSignal(
                    action='hedge',
                    option_address=position.option_address,
                    underlying_asset=position.underlying_asset,
                    hedge_quantity=hedge_quantity,
                    expected_pnl_impact=abs(hedge_quantity) * 0.001,  # Estimated cost
                    confidence=0.8,
                    reason=f'Delta out of tolerance: {position.delta:.4f}',
                    timestamp=current_time
                )

            # Check if position should be closed (gamma decayed)
            if abs(position.gamma) < self.gamma_threshold * 0.1:
                return GammaScalpingSignal(
                    action='close',
                    option_address=position.option_address,
                    underlying_asset=position.underlying_asset,
                    hedge_quantity=0,
                    expected_pnl_impact=position.unrealized_pnl,
                    confidence=0.9,
                    reason='Gamma decayed, close position',
                    timestamp=current_time
                )

            return None

        except Exception as e:
            self.logger.error(f"Error checking hedging needs for {position.option_address}: {e}")
            return None

    async def _find_gamma_scalping_candidates(self) -> List[Dict]:
        """
        Find new options suitable for gamma scalping
        """
        try:
            candidates = []

            # This would integrate with options data providers
            # For now, return mock candidates

            # Mock high-gamma option
            candidates.append({
                'option_address': '0x1234567890123456789012345678901234567890',
                'underlying_asset': 'ETH',
                'gamma': 0.25,
                'delta': 0.02,
                'expected_daily_premium': 15.50,
                'confidence': 0.85,
                'risk_score': 0.3
            })

            # Mock another candidate
            candidates.append({
                'option_address': '0x0987654321098765432109876543210987654321',
                'underlying_asset': 'BTC',
                'gamma': 0.18,
                'delta': -0.03,
                'expected_daily_premium': 22.30,
                'confidence': 0.78,
                'risk_score': 0.4
            })

            # Filter by gamma threshold and risk
            filtered_candidates = [
                c for c in candidates
                if c['gamma'] >= self.gamma_threshold and c['risk_score'] <= 0.5
            ]

            return filtered_candidates

        except Exception as e:
            self.logger.error(f"Error finding gamma scalping candidates: {e}")
            return []

    def open_gamma_scalping_position(self, option_address: str, position_size: float,
                                   initial_delta: float, initial_gamma: float) -> bool:
        """
        Open a new gamma scalping position
        """
        try:
            if option_address in self.positions:
                self.logger.warning(f"Position already exists for {option_address}")
                return False

            # Check total exposure limits
            total_gamma = sum(p.gamma * p.position_size for p in self.positions.values())
            total_delta = sum(p.delta * p.position_size for p in self.positions.values())

            if total_gamma + (initial_gamma * position_size) > self.max_gamma_exposure:
                self.logger.warning("Gamma exposure limit exceeded")
                return False

            if total_delta + (initial_delta * position_size) > self.max_delta_exposure:
                self.logger.warning("Delta exposure limit exceeded")
                return False

            position = GammaScalpingPosition(
                option_address=option_address,
                underlying_asset="UNKNOWN",  # Would be fetched from option data
                position_size=position_size,
                delta=initial_delta,
                gamma=initial_gamma,
                current_price=0,  # Would be fetched
                entry_price=0,  # Would be fetched
                unrealized_pnl=0,
                hedge_ratio=0,
                last_hedge_time=time.time(),
                timestamp=time.time()
            )

            self.positions[option_address] = position
            self.logger.info(f"Opened gamma scalping position for {option_address}")
            return True

        except Exception as e:
            self.logger.error(f"Error opening gamma scalping position: {e}")
            return False

    def update_position_greeks(self, option_address: str, new_delta: float,
                             new_gamma: float, current_price: float):
        """
        Update position Greeks after price movement
        """
        try:
            if option_address not in self.positions:
                return

            position = self.positions[option_address]
            position.delta = new_delta
            position.gamma = new_gamma
            position.current_price = current_price

            # Update unrealized P&L (simplified)
            position.unrealized_pnl = (current_price - position.entry_price) * position.position_size

            self.logger.debug(f"Updated Greeks for {option_address}: delta={new_delta:.4f}, gamma={new_gamma:.4f}")

        except Exception as e:
            self.logger.error(f"Error updating position Greeks: {e}")

    def execute_hedge(self, option_address: str, hedge_quantity: float) -> bool:
        """
        Execute hedging trade
        """
        try:
            if option_address not in self.positions:
                return False

            position = self.positions[option_address]

            # Update hedge ratio
            position.hedge_ratio += hedge_quantity
            position.last_hedge_time = time.time()

            self.logger.info(f"Executed hedge for {option_address}: {hedge_quantity} units")
            return True

        except Exception as e:
            self.logger.error(f"Error executing hedge: {e}")
            return False

    def close_position(self, option_address: str) -> Optional[float]:
        """
        Close gamma scalping position
        """
        try:
            if option_address not in self.positions:
                return None

            position = self.positions[option_address]
            final_pnl = position.unrealized_pnl

            # Close any open hedges
            if position.hedge_ratio != 0:
                self.logger.info(f"Closing hedge position: {position.hedge_ratio} units")

            del self.positions[option_address]
            self.logger.info(f"Closed gamma scalping position for {option_address}, P&L: {final_pnl:.2f}")
            return final_pnl

        except Exception as e:
            self.logger.error(f"Error closing position: {e}")
            return None

    def get_portfolio_exposure(self) -> Dict[str, float]:
        """
        Get current portfolio exposure
        """
        try:
            total_gamma = sum(p.gamma * p.position_size for p in self.positions.values())
            total_delta = sum(p.delta * p.position_size for p in self.positions.values())
            total_positions = len(self.positions)

            return {
                'total_gamma': total_gamma,
                'total_delta': total_delta,
                'total_positions': total_positions,
                'gamma_limit': self.max_gamma_exposure,
                'delta_limit': self.max_delta_exposure
            }

        except Exception as e:
            self.logger.error(f"Error getting portfolio exposure: {e}")
            return {}

    def calculate_optimal_hedge_size(self, current_delta: float, gamma: float,
                                   time_to_expiry: float) -> float:
        """
        Calculate optimal hedge size for delta neutrality
        """
        try:
            # Simplified calculation - in production would use more sophisticated models
            base_hedge = -current_delta

            # Adjust for gamma (theta/gamma scalping consideration)
            gamma_adjustment = gamma * time_to_expiry * 0.1

            optimal_hedge = base_hedge + gamma_adjustment

            return optimal_hedge

        except Exception as e:
            self.logger.error(f"Error calculating optimal hedge size: {e}")
            return 0

    async def monitor_positions(self):
        """
        Continuously monitor positions and generate signals
        """
        while True:
            try:
                signals = await self.scan_gamma_scalping_opportunities()

                for signal in signals:
                    self.logger.info(f"Gamma scalping signal: {signal.action} for {signal.option_address}")

                    if signal.action == 'hedge':
                        self.execute_hedge(signal.option_address, signal.hedge_quantity)
                    elif signal.action == 'close':
                        self.close_position(signal.option_address)

                await asyncio.sleep(60)  # Check every minute

            except Exception as e:
                self.logger.error(f"Error in position monitoring: {e}")
                await asyncio.sleep(60)
