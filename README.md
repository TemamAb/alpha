# AlphaMark - Flash Loan Arbitrage System

![AlphaMark](https://img.shields.io/badge/AlphaMark-v1.0.0-blue)
![Python](https://img.shields.io/badge/Python-3.11+-green)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Solidity](https://img.shields.io/badge/Solidity-0.8.10+-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ⚠️ Disclaimer

**WARNING: This is a high-risk financial application. Flash loan arbitrage involves significant technical and financial risks including but not limited to smart contract vulnerabilities, oracle manipulation, sandwich attacks, and market volatility. Use at your own risk. Never deploy with funds you cannot afford to lose.**

---

## 📋 Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Security](#security)
- [Development](#development)
- [License](#license)

---

## 🏗️ Architecture

AlphaMark is a distributed arbitrage system composed of multiple microservices:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Strategy      │────▶│   Execution      │────▶│   Monitoring    │
│   Engine        │     │   Bot            │     │   Dashboard     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │        Redis           │
                    │   (Message Broker)     │
                    └────────────────────────┘
```

### Components

| Component | Technology | Description |
|-----------|------------|-------------|
| Strategy Engine | Python | Scans DEXes for arbitrage opportunities |
| Execution Bot | Python | Executes flash loan transactions |
| Monitoring Dashboard | Node.js | Real-time UI for system monitoring |
| Smart Contracts | Solidity | Aave flash loan integration |

---

## ✨ Features

- **Multi-hop Arbitrage**: Execute complex arbitrage paths across multiple DEXes
- **Cross-chain Support**: Ethereum, Polygon, BSC, Arbitrum, Optimism
- **Flash Loans**: Aave V3 integration for capital-efficient trading
- **Real-time Monitoring**: Live dashboard with profit tracking
- **Risk Management**: Liquidity checks, slippage protection, profit thresholds
- **MEV Protection**: Optional private mempool submission
- **Gas Optimization**: EIP-1559 support with predictive gas pricing
- **Paper Trading**: Test strategies without real funds

---

## 🔧 Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- Ethereum RPC endpoint (Alchemy/Infura)
- Redis (included in Docker Compose)

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/TemamAb/alphamark.git
cd alphamark
```

### 2. Configure Environment

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

### 3. Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Access the Dashboard

Open your browser and navigate to:
- **Dashboard**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PRIVATE_KEY` | Wallet private key for transactions | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `ETHEREUM_RPC` | Ethereum RPC endpoint | Yes |
| `OPENAI_API_KEY` | For Alpha-Copilot AI assistant | No |
| `PAPER_TRADING_MODE` | Set to "true" for simulation | No |

### Supported Chains

The system supports the following EVM chains:

- Ethereum Mainnet
- Polygon
- BSC (BNB Chain)
- Arbitrum
- Optimism
- Base
- Avalanche
- And more...

### Smart Contract Deployment

Deploy the FlashLoan contract to your target chain:

```bash
cd smart_contracts
npm install
npx hardhat run scripts/deploy.js --network mainnet
```

---

## ☁️ Deployment

### Local Development

```bash
# Start all services
docker-compose up -d

# Start with hot reload
docker-compose up
```

### Production (Docker)

```bash
# Build and start
docker-compose -f docker-compose.yml up -d --build

# Scale the bot service
docker-compose up -d --scale bot=3
```

### Fly.io Deployment

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
fly auth login

# Launch the app
fly launch

# Deploy
fly deploy
```

### Manual Deployment

```bash
# Install dependencies
pip install -r requirements.txt
cd monitoring_dashboard && npm install && cd ..

# Start Redis
docker run -d -p 6379:6379 redis:alpine

# Start the bot
python execution_bot/scripts/bot.py

# Start the dashboard
cd monitoring_dashboard && npm start
```

---

## 📊 Monitoring

### Dashboard Features

- **Real-time Profit Tracking**: Live P&L updates
- **Trade History**: Complete audit trail of all transactions
- **Wallet Management**: Add/remove trading wallets
- **System Health**: CPU, Memory, Network status
- **Alpha-Copilot**: AI-powered trading assistant

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats` | GET | Get current statistics |
| `/api/health` | GET | Health check |
| `/api/control/start` | POST | Start trading |
| `/api/control/stop` | POST | Emergency stop |
| `/api/wallet/add` | POST | Add wallet |

---

## 🔒 Security

### Best Practices

1. **Never commit private keys** - Use environment variables
2. **Enable 2FA** on all connected services
3. **Use hardware wallets** for production funds
4. **Enable MEV protection** in production
5. **Monitor alerts** - Set up notifications for unusual activity
6. **Regular audits** - Review smart contracts regularly

### Security Checklist

- [ ] Private keys stored in secrets manager
- [ ] RPC endpoints are authenticated
- [ ] MEV protection enabled
- [ ] Emergency stop accessible
- [ ] Wallet backup procedures documented
- [ ] Insurance coverage obtained (if available)

---

## 🛠️ Development

### Running Tests

```bash
# Python tests
python -m pytest simulation_backtesting/test_cases/ -v

# Smart contract tests
cd smart_contracts
npm test
```

### Project Structure

```
alphamark/
├── smart_contracts/       # Solidity contracts
│   └── FlashLoan.sol
├── strategy_engine/       # Arbitrage strategy engine
│   └── src/
├── execution_bot/          # Transaction executor
│   └── scripts/
├── monitoring_dashboard/   # Node.js dashboard
│   ├── frontend/
│   └── server-dashboard.js
├── risk_management/        # Risk checks
├── market_data_aggregator/ # Price feeds
├── mempool_mev/          # MEV protection
└── simulation_backtesting/ # Testing framework
```

---

## 📝 License

MIT License - See [LICENSE](LICENSE) for details.

---

## ⚡ Support

- **Documentation**: See [docs/](docs/) folder
- **Issues**: Open an issue on GitHub
- **Discord**: Join our community

---

**⚠️ Important**: This software is provided "as is" without warranty of any kind. Use at your own risk. Always test thoroughly before deploying with real funds.
