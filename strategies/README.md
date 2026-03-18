# Alpha-Orion Accredited Arbitrage Strategies

## Overview
This directory contains the 10 Alpha-Orion accredited arbitrage strategies for production deployment.

## Strategy List

### 1. Triangular Arbitrage
- **File**: `triangular_arbitrage.py`
- **Description**: Exploits price differences between three crypto assets on the same DEX
- **Status**: Current Basic Strategy

### 2. Options Arbitrage
- **File**: `options_arbitrage.py`
- **Description**: Uses Opyn API for options market arbitrage
- **Status**: Game Changer

### 3. Perpetuals Arbitrage
- **File**: `perpetuals_arbitrage.py`
- **Description**: Uses dYdX and GMX APIs for perpetual futures arbitrage
- **Status**: Game Changer

### 4. Gamma Scalping
- **File**: `gamma_scalping.py`
- **Description**: Dynamic hedging of delta exposure
- **Status**: Game Changer

### 5. Delta-Neutral Arbitrage
- **File**: `delta_neutral.py`
- **Description**: Market-neutral strategy using derivatives
- **Status**: Game Changer

### 6. Cross-Exchange Arbitrage
- **File**: `cross_exchange_arbitrage.py`
- **Description**: Price differences between 50+ exchanges
- **Status**: Enterprise

### 7. Statistical Arbitrage
- **File**: `statistical_arbitrage.py`
- **Description**: Cointegration models across trading pairs
- **Status**: Enterprise

### 8. Batch Auction Arbitrage
- **File**: `batch_auction_arbitrage.py`
- **Description**: Solver competition model
- **Status**: Enterprise

### 9. Path Optimization Arbitrage
- **File**: `path_optimization_arbitrage.py`
- **Description**: Multi-hop routing across liquidity sources
- **Status**: Enterprise

### 10. Cross-Asset Arbitrage
- **File**: `cross_asset_arbitrage.py`
- **Description**: Crypto vs traditional assets arbitrage
- **Status**: Enterprise

## Production Configuration

See `config/production_config.yaml` for production deployment settings.
