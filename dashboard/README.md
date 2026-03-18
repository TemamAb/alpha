# Alpha-Orion Institutional Arbitrage Control Center

A sophisticated React-based dashboard for monitoring and controlling Alpha-Orion's institutional arbitrage operations, featuring real-time profit tracking, opportunity scanning, and AI-powered insights.

## 🚀 Features

### Core Functionality
- **Real-time Profit Monitoring**: Live PnL tracking with historical data
- **Arbitrage Opportunities**: Real-time opportunity scanning across multiple chains
- **System Health Dashboard**: Comprehensive system status and performance metrics
- **Pimlico Gasless Integration**: ERC-4337 gasless transaction monitoring
- **AI-Powered Insights**: Gemini AI integration for strategic recommendations

### Technical Features
- **TypeScript**: Full type safety with comprehensive API types
- **State Management**: Zustand for efficient, scalable state management
- **Real-time Updates**: WebSocket integration for live data streaming
- **Responsive Design**: Institutional-grade UI with dark theme
- **Error Handling**: Robust error boundaries and fallback states

## 🏗️ Architecture

```
src/
├── components/     # Reusable UI components
├── hooks/         # Custom React hooks
│   └── useAlphaOrionStore.ts  # Global state management
├── services/      # API and external service integrations
│   └── api.ts     # Alpha-Orion API client
├── types/         # TypeScript type definitions
│   └── api.ts     # API response and data types
└── utils/         # Utility functions
```

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **State Management**: Zustand with immer middleware
- **Styling**: Tailwind CSS with custom institutional theme
- **Charts**: Recharts for data visualization
- **API Client**: Axios with interceptors
- **AI Integration**: Google Gemini 3.0 Flash
- **Real-time**: Socket.io-client for live updates

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Alpha-Orion backend services running on port 8080

### Installation
```bash
cd alpha-orion/dashboard
npm install
```

### Development
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm run preview
```

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file in the dashboard directory:

```env
# Gemini AI API Key
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Alpha-Orion Backend URL
VITE_API_BASE_URL=http://localhost:8080
```

### API Integration
The dashboard connects to Alpha-Orion's backend services:

- **Profit Data**: `/analytics/total-pnl`
- **Opportunities**: `/opportunities`
- **System Health**: `/mode/current`
- **Pimlico Status**: `/pimlico/status`

## 📊 Dashboard Sections

### 1. Profit Overview
- Total PnL with daily/weekly/monthly breakdowns
- Win rate and average profit per trade
- Largest wins/losses tracking

### 2. Arbitrage Opportunities
- Real-time opportunity scanning
- Risk assessment (low/medium/high)
- Estimated profit calculations
- One-click execution capabilities

### 3. System Health
- Production/Testing/Maintenance modes
- Uptime and connection status
- Error rates and performance metrics

### 4. Pimlico Gasless Mode
- Transaction count and gas savings
- Average gas reduction percentage
- ERC-4337 account abstraction status

### 5. AI Neural Advisor
- Strategic arbitrage recommendations
- Risk analysis and mitigation suggestions
- Market condition assessments

## 🔒 Security Features

- **API Key Protection**: Secure environment variable handling
- **Type Safety**: Comprehensive TypeScript coverage
- **Error Boundaries**: Graceful error handling and recovery
- **Input Validation**: Client-side validation for all forms
- **Rate Limiting**: Built-in request throttling

## 📈 Performance

- **Lazy Loading**: Components loaded on demand
- **Memoization**: Expensive calculations cached
- **Optimized Re-renders**: Selective state updates
- **Bundle Splitting**: Code split by routes/features

## 🧪 Testing

```bash
# Run tests
npm run test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🚀 Deployment

### Local Development
```bash
npm run dev
# Access at http://localhost:5173
```

### Production Build
```bash
npm run build
npm run preview
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 80
CMD ["npm", "run", "preview"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper TypeScript types
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

Proprietary - Alpha-Orion Institutional Systems

## 🆘 Support

For support and questions:
- Check the Alpha-Orion documentation
- Review system logs in the backend services
- Contact the development team

---

**Built for institutional arbitrage excellence** ⚡
