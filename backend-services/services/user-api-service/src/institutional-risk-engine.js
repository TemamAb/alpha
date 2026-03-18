const { ethers } = require('ethers');

/**
 * INSTITUTIONAL-GRADE RISK MANAGEMENT ENGINE
 * Implements VaR, stress testing, position limits, and advanced risk metrics
 */
class InstitutionalRiskEngine {
  constructor() {
    this.riskLimits = {
      maxPositionSize: ethers.utils.parseUnits('1000', 18), // $1000 max per position
      maxPortfolioVaR: 0.05, // 5% VaR limit
      maxDrawdown: 0.10, // 10% max drawdown
      maxLeverage: 3.0, // 3x max leverage
      maxConcentration: 0.25, // 25% max concentration per asset
      minLiquidityRatio: 0.20 // 20% minimum liquidity
    };

    this.portfolio = {
      positions: new Map(),
      totalValue: ethers.BigNumber.from(0),
      totalVaR: 0,
      currentDrawdown: 0,
      leverage: 1.0,
      liquidityRatio: 1.0
    };

    this.historicalData = {
      returns: [],
      volatility: [],
      correlations: new Map(),
      stressScenarios: []
    };

    this.riskMetrics = {
      valueAtRisk: 0,
      expectedShortfall: 0,
      beta: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      calmarRatio: 0
    };

    console.log('[InstitutionalRiskEngine] Initialized with enterprise risk limits');
  }

  /**
   * Calculate Value at Risk (VaR) using historical simulation
   */
  calculateVaR(returns, confidence = 0.95, timeHorizon = 1) {
    if (returns.length < 30) return 0;

    // Sort returns in ascending order
    const sortedReturns = [...returns].sort((a, b) => a - b);

    // Find the return at the confidence level
    const index = Math.floor((1 - confidence) * sortedReturns.length);
    const varReturn = sortedReturns[index];

    // Scale for time horizon (assuming daily returns)
    const scaledVaR = varReturn * Math.sqrt(timeHorizon);

    return Math.abs(scaledVaR);
  }

  /**
   * Calculate Expected Shortfall (CVaR)
   */
  calculateExpectedShortfall(returns, confidence = 0.95) {
    if (returns.length < 30) return 0;

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidence) * sortedReturns.length);

    // Average of returns beyond VaR
    const tailReturns = sortedReturns.slice(0, varIndex + 1);
    const expectedShortfall = tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length;

    return Math.abs(expectedShortfall);
  }

  /**
   * Stress testing with multiple scenarios
   */
  async runStressTests(portfolioValue) {
    const scenarios = [
      { name: 'Flash Crash', shock: -0.30 },
      { name: 'Liquidity Crisis', shock: -0.20 },
      { name: 'DEX Exploit', shock: -0.50 },
      { name: 'Smart Contract Bug', shock: -1.00 },
      { name: 'Regulatory Action', shock: -0.15 },
      { name: 'Market Maker Failure', shock: -0.25 }
    ];

    const results = [];

    for (const scenario of scenarios) {
      const stressedValue = portfolioValue * (1 + scenario.shock);
      const loss = portfolioValue - stressedValue;
      const lossPercentage = scenario.shock;

      // Check if loss exceeds risk limits
      const breachesLimit = Math.abs(lossPercentage) > this.riskLimits.maxDrawdown;

      results.push({
        scenario: scenario.name,
        shock: scenario.shock,
        stressedValue: stressedValue,
        loss: loss,
        lossPercentage: lossPercentage,
        breachesLimit: breachesLimit,
        recoveryTime: this.estimateRecoveryTime(lossPercentage)
      });
    }

    return results;
  }

  /**
   * Estimate recovery time based on historical data
   */
  estimateRecoveryTime(lossPercentage) {
    // Simplified recovery estimation
    const severity = Math.abs(lossPercentage);
    if (severity < 0.05) return '1-2 days';
    if (severity < 0.10) return '1 week';
    if (severity < 0.20) return '2-4 weeks';
    if (severity < 0.50) return '1-3 months';
    return '3-6 months or more';
  }

  /**
   * Check position limits and concentration
   */
  checkPositionLimits(position, totalPortfolioValue) {
    const issues = [];

    // Position size limit
    const positionValue = this.getPositionValue(position);
    const positionPercentage = positionValue / totalPortfolioValue;

    if (positionValue > this.riskLimits.maxPositionSize) {
      issues.push({
        type: 'POSITION_SIZE',
        severity: 'HIGH',
        message: `Position size $${positionValue} exceeds limit $${this.riskLimits.maxPositionSize}`,
        recommendation: 'Reduce position size or split into multiple trades'
      });
    }

    // Concentration limit
    if (positionPercentage > this.riskLimits.maxConcentration) {
      issues.push({
        type: 'CONCENTRATION',
        severity: 'MEDIUM',
        message: `Position concentration ${positionPercentage.toFixed(2)}% exceeds limit ${(this.riskLimits.maxConcentration * 100)}%`,
        recommendation: 'Diversify across more assets or reduce exposure'
      });
    }

    return issues;
  }

  /**
   * Real-time portfolio monitoring
   */
  updatePortfolioMetrics(positions, totalValue) {
    this.portfolio.positions = new Map(positions);
    this.portfolio.totalValue = totalValue;

    // Calculate leverage
    const totalExposure = Array.from(positions.values())
      .reduce((sum, pos) => sum + this.getPositionExposure(pos), 0);
    this.portfolio.leverage = totalExposure / totalValue;

    // Calculate liquidity ratio
    const liquidAssets = this.calculateLiquidAssets(positions);
    this.portfolio.liquidityRatio = liquidAssets / totalValue;

    // Update risk metrics
    this.updateRiskMetrics();

    return {
      leverage: this.portfolio.leverage,
      liquidityRatio: this.portfolio.liquidityRatio,
      var: this.riskMetrics.valueAtRisk,
      expectedShortfall: this.riskMetrics.expectedShortfall,
      breaches: this.checkRiskBreaches()
    };
  }

  /**
   * Check for risk limit breaches
   */
  checkRiskBreaches() {
    const breaches = [];

    if (this.portfolio.leverage > this.riskLimits.maxLeverage) {
      breaches.push({
        type: 'LEVERAGE',
        severity: 'CRITICAL',
        message: `Leverage ${this.portfolio.leverage.toFixed(2)}x exceeds limit ${this.riskLimits.maxLeverage}x`,
        action: 'IMMEDIATE_REDUCTION'
      });
    }

    if (this.portfolio.liquidityRatio < this.riskLimits.minLiquidityRatio) {
      breaches.push({
        type: 'LIQUIDITY',
        severity: 'HIGH',
        message: `Liquidity ratio ${this.portfolio.liquidityRatio.toFixed(2)} below minimum ${this.riskLimits.minLiquidityRatio}`,
        action: 'INCREASE_LIQUIDITY'
      });
    }

    if (this.riskMetrics.valueAtRisk > this.riskLimits.maxPortfolioVaR) {
      breaches.push({
        type: 'VAR_LIMIT',
        severity: 'HIGH',
        message: `VaR ${this.riskMetrics.valueAtRisk.toFixed(2)} exceeds limit ${this.riskLimits.maxPortfolioVaR}`,
        action: 'REDUCE_RISK'
      });
    }

    return breaches;
  }

  /**
   * Update comprehensive risk metrics
   */
  updateRiskMetrics() {
    if (this.historicalData.returns.length < 30) return;

    this.riskMetrics.valueAtRisk = this.calculateVaR(this.historicalData.returns);
    this.riskMetrics.expectedShortfall = this.calculateExpectedShortfall(this.historicalData.returns);

    // Calculate Sharpe ratio
    const avgReturn = this.historicalData.returns.reduce((sum, ret) => sum + ret, 0) / this.historicalData.returns.length;
    const volatility = this.calculateVolatility(this.historicalData.returns);
    this.riskMetrics.sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;

    // Calculate Sortino ratio (downside deviation)
    const downsideReturns = this.historicalData.returns.filter(ret => ret < 0);
    const downsideVolatility = this.calculateVolatility(downsideReturns);
    this.riskMetrics.sortinoRatio = downsideVolatility > 0 ? avgReturn / downsideVolatility : 0;

    // Calculate maximum drawdown
    this.riskMetrics.maxDrawdown = this.calculateMaxDrawdown();
    this.riskMetrics.calmarRatio = this.riskMetrics.maxDrawdown > 0 ?
      avgReturn / this.riskMetrics.maxDrawdown : 0;
  }

  /**
   * Calculate volatility (standard deviation)
   */
  calculateVolatility(returns) {
    if (returns.length < 2) return 0;

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);

    return Math.sqrt(variance);
  }

  /**
   * Calculate maximum drawdown
   */
  calculateMaxDrawdown() {
    if (this.historicalData.returns.length < 2) return 0;

    let peak = 1;
    let maxDrawdown = 0;
    let currentValue = 1;

    for (const ret of this.historicalData.returns) {
      currentValue *= (1 + ret);
      if (currentValue > peak) {
        peak = currentValue;
      }
      const drawdown = (peak - currentValue) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * Add historical return data
   */
  addHistoricalReturn(returnValue) {
    this.historicalData.returns.push(returnValue);

    // Keep only last 252 trading days (1 year)
    if (this.historicalData.returns.length > 252) {
      this.historicalData.returns.shift();
    }
  }

  /**
   * Evaluate trade opportunity against risk limits
   */
  evaluateTradeOpportunity(opportunity) {
    const evaluation = {
      approved: true,
      riskScore: 0,
      issues: [],
      recommendations: [],
      limits: {}
    };

    // Check position limits
    const positionIssues = this.checkPositionLimits(opportunity, this.portfolio.totalValue);
    evaluation.issues.push(...positionIssues);

    // Check portfolio impact
    const portfolioImpact = this.assessPortfolioImpact(opportunity);
    if (portfolioImpact.varIncrease > 0.01) { // 1% VaR increase
      evaluation.issues.push({
        type: 'PORTFOLIO_IMPACT',
        severity: 'MEDIUM',
        message: `Trade increases portfolio VaR by ${(portfolioImpact.varIncrease * 100).toFixed(2)}%`,
        recommendation: 'Consider smaller position size'
      });
    }

    // Check liquidity requirements
    if (opportunity.loanAmount > this.portfolio.totalValue * 0.1) { // 10% of portfolio
      evaluation.issues.push({
        type: 'LIQUIDITY_REQUIREMENT',
        severity: 'HIGH',
        message: 'Trade size exceeds recommended liquidity allocation',
        recommendation: 'Reduce trade size or increase liquidity buffer'
      });
    }

    // Calculate risk score
    evaluation.riskScore = this.calculateRiskScore(evaluation.issues);

    // Determine approval
    evaluation.approved = evaluation.issues.filter(issue => issue.severity === 'CRITICAL').length === 0;

    // Generate recommendations
    evaluation.recommendations = this.generateRecommendations(evaluation.issues, opportunity);

    return evaluation;
  }

  /**
   * Calculate risk score from 0-100
   */
  calculateRiskScore(issues) {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case 'CRITICAL':
          score -= 30;
          break;
        case 'HIGH':
          score -= 20;
          break;
        case 'MEDIUM':
          score -= 10;
          break;
        case 'LOW':
          score -= 5;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate recommendations based on issues
   */
  generateRecommendations(issues, opportunity) {
    const recommendations = [];

    if (issues.some(issue => issue.type === 'POSITION_SIZE')) {
      recommendations.push('Split large trades into smaller, manageable positions');
    }

    if (issues.some(issue => issue.type === 'CONCENTRATION')) {
      recommendations.push('Diversify across multiple assets and protocols');
    }

    if (issues.some(issue => issue.type === 'LEVERAGE')) {
      recommendations.push('Reduce leverage to stay within risk limits');
    }

    if (issues.some(issue => issue.type === 'LIQUIDITY')) {
      recommendations.push('Maintain higher liquidity reserves for market volatility');
    }

    if (issues.length === 0) {
      recommendations.push('Trade parameters within acceptable risk limits');
    }

    return recommendations;
  }

  /**
   * Assess portfolio impact of a trade
   */
  assessPortfolioImpact(opportunity) {
    // Simplified impact assessment
    const positionSize = opportunity.loanAmount;
    const portfolioSize = this.portfolio.totalValue;

    return {
      varIncrease: (positionSize / portfolioSize) * 0.02, // Assume 2% VaR impact per position size
      concentrationIncrease: positionSize / portfolioSize,
      liquidityImpact: positionSize / (portfolioSize * this.portfolio.liquidityRatio)
    };
  }

  /**
   * Get position value (helper)
   */
  getPositionValue(position) {
    // Simplified - in production would calculate based on current market prices
    return position.potentialProfit || position.loanAmount || 0; // Use potentialProfit if available, otherwise loanAmount
  }

  /**
   * Get position exposure (helper)
   */
  getPositionExposure(position) {
    // Simplified - in production would account for leverage and derivatives
    return this.getPositionValue(position);
  }

  /**
   * Calculate liquid assets (helper)
   */
  calculateLiquidAssets(positions) {
    // Simplified - in production would check actual liquidity of assets
    return this.portfolio.totalValue * 0.8; // Assume 80% liquidity
  }

  /**
   * Get comprehensive risk report
   */
  getRiskReport() {
    return {
      portfolio: this.portfolio,
      riskMetrics: this.riskMetrics,
      limits: this.riskLimits,
      breaches: this.checkRiskBreaches(),
      stressTestResults: [], // Would be populated by runStressTests
      recommendations: this.generateRiskRecommendations()
    };
  }

  /**
   * Generate risk management recommendations
   */
  generateRiskRecommendations() {
    const recommendations = [];

    if (this.portfolio.leverage > 2.0) {
      recommendations.push('Consider reducing leverage to improve risk-adjusted returns');
    }

    if (this.riskMetrics.sharpeRatio < 1.0) {
      recommendations.push('Portfolio returns not compensating for risk taken - review strategy');
    }

    if (this.riskMetrics.maxDrawdown > 0.15) {
      recommendations.push('Implement stricter stop-loss rules to limit drawdowns');
    }

    if (this.portfolio.liquidityRatio < 0.3) {
      recommendations.push('Increase liquidity buffer for better risk management');

    }

    return recommendations;
  }
}

module.exports = InstitutionalRiskEngine;