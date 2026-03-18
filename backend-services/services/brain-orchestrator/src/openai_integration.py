"""
OpenAI Integration Module for Alpha-Orion
Replaces Google Gemini with OpenAI API

Usage:
    Set environment variable: OPENAI_API_KEY
    Or pass api_key parameter to constructor
"""

import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime

try:
    import openai
    from openai import OpenAI
except ImportError:
    print("Installing openai package...")
    import subprocess
    subprocess.check_call(["pip", "install", "openai"])
    from openai import OpenAI


class OpenAIArbitrageAssistant:
    """
    OpenAI-powered arbitrage assistant to replace Gemini
    Provides strategy optimization, risk analysis, and decision making
    """
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o"):
        """
        Initialize OpenAI client
        
        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
            model: Model to use (default: gpt-4o)
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key required. Set OPENAI_API_KEY environment variable or pass api_key parameter")
        
        self.client = OpenAI(api_key=self.api_key)
        self.model = model
        self.conversation_history: List[Dict] = []
        
        # System prompt for arbitrage trading
        self.system_prompt = """You are an expert arbitrage trading assistant for decentralized exchanges (DEX).
Your role is to:
1. Analyze market data and identify profitable arbitrage opportunities
2. Evaluate risks and suggest risk mitigation strategies
3. Optimize trading parameters (gas, slippage, route)
4. Monitor multiple DEXs (Uniswap, Sushiswap, Curve, etc.)
5. Provide real-time strategy adjustments

You have deep knowledge of:
- Flash loans and DeFi protocols
- Cross-chain arbitrage
- Smart contract security
- Gas optimization
- Slippage protection
- MEV (Maximal Extractable Value) strategies

Always prioritize safety and risk management. Suggest conservative parameters for new strategies."""


    def analyze_arbitrage_opportunity(self, market_data: Dict) -> Dict:
        """
        Analyze market data for arbitrage opportunities
        
        Args:
            market_data: Dictionary containing:
                - token_pairs: List of trading pairs
                - prices: Current prices across DEXs
                - gas_price: Current gas price in gwei
                - volume: Trading volumes
        
        Returns:
            Analysis result with recommendations
        """
        prompt = f"""Analyze the following market data for arbitrage opportunities:

Market Data:
{json.dumps(market_data, indent=2)}

Provide:
1. Identified arbitrage opportunities
2. Estimated profit potential
3. Risk assessment (1-10 scale)
4. Recommended action (EXECUTE / WAIT / MONITOR)
5. Suggested parameters (slippage, gas limit, route)"""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )

        return {
            "analysis": response.choices[0].message.content,
            "timestamp": datetime.utcnow().isoformat(),
            "model": self.model
        }


    def optimize_strategy(self, strategy_params: Dict, market_conditions: Dict) -> Dict:
        """
        Optimize trading strategy based on current conditions
        
        Args:
            strategy_params: Current strategy parameters
            market_conditions: Current market conditions
        
        Returns:
            Optimized parameters
        """
        prompt = f"""Optimize the following trading strategy:

Current Parameters:
{json.dumps(strategy_params, indent=2)}

Market Conditions:
{json.dumps(market_conditions, indent=2)}

Provide optimized parameters for:
1. Position size
2. Slippage tolerance
3. Gas price threshold
4. Stop loss level
5. Take profit level"""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=800
        )

        return {
            "optimization": response.choices[0].message.content,
            "timestamp": datetime.utcnow().isoformat(),
            "model": self.model
        }


    def assess_risk(self, trade_params: Dict) -> Dict:
        """
        Assess risk for a proposed trade
        
        Args:
            trade_params: Trade parameters including:
                - token_pair
                - amount
                - expected_profit
                - gas_cost
        
        Returns:
            Risk assessment with score and recommendations
        """
        prompt = f"""Assess the risk of this trade:

Trade Parameters:
{json.dumps(trade_params, indent=2)}

Provide:
1. Risk score (1-10)
2. Risk factors
3. Mitigation recommendations
4. Should proceed? (YES / NO / CONDITIONAL)"""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )

        return {
            "risk_assessment": response.choices[0].message.content,
            "timestamp": datetime.utcnow().isoformat(),
            "model": self.model
        }


    def generate_trading_signal(self, market_data: Dict, historical_data: Dict) -> Dict:
        """
        Generate trading signal based on market and historical data
        
        Args:
            market_data: Current market data
            historical_data: Historical price/volume data
        
        Returns:
            Trading signal with confidence level
        """
        prompt = f"""Generate a trading signal based on:

Current Market Data:
{json.dumps(market_data, indent=2)}

Historical Data:
{json.dumps(historical_data, indent=2)}

Provide:
1. Signal (BUY / SELL / HOLD)
2. Confidence level (%)
3. Entry price range
4. Exit price targets
5. Time horizon"""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.6,
            max_tokens=600
        )

        return {
            "signal": response.choices[0].message.content,
            "timestamp": datetime.utcnow().isoformat(),
            "model": self.model
        }


    def chat(self, message: str, context: Optional[Dict] = None) -> str:
        """
        Chat with the AI assistant
        
        Args:
            message: User message
            context: Optional context data
        
        Returns:
            AI response
        """
        messages = [{"role": "system", "content": self.system_prompt}]
        
        # Add conversation history
        messages.extend(self.conversation_history)
        
        # Add current message
        if context:
            message = f"Context: {json.dumps(context)}\n\n{message}"
        messages.append({"role": "user", "content": message})
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        assistant_response = response.choices[0].message.content
        
        # Update conversation history
        self.conversation_history.append({"role": "user", "content": message})
        self.conversation_history.append({"role": "assistant", "content": assistant_response})
        
        # Keep history manageable
        if len(self.conversation_history) > 20:
            self.conversation_history = self.conversation_history[-20:]
        
        return assistant_response


    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []


# Example usage
if __name__ == "__main__":
    # Initialize with API key from environment
    assistant = OpenAIArbitrageAssistant()
    
    # Example market data
    market_data = {
        "token_pairs": ["USDC/ETH", "USDC/USDT", "ETH/UNI"],
        "prices": {
            "USDC/ETH": {"uniswap": 0.00035, "sushiswap": 0.000352},
            "USDC/USDT": {"uniswap": 1.0001, "curve": 0.9999},
            "ETH/UNI": {"uniswap": 1500, "sushiswap": 1498}
        },
        "gas_price": 20,  # gwei
        "volume_24h": 1000000
    }
    
    # Analyze arbitrage opportunity
    result = assistant.analyze_arbitrage_opportunity(market_data)
    print("Arbitrage Analysis:")
    print(result["analysis"])
