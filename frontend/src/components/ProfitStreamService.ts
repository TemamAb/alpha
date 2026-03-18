import { AlphaOrionWebSocketServer, MessageType } from '../websocket/WebSocketServer';

export class ProfitStreamService {
  private wsServer: AlphaOrionWebSocketServer;
  private isRunning: boolean = false;

  constructor(wsServer: AlphaOrionWebSocketServer) {
    this.wsServer = wsServer;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[STREAM] Starting real-time profit simulation stream...');

    // 1. Profit Drops (Every 3-6 seconds)
    setInterval(() => this.emitProfitDrop(), 4000);

    // 2. Confirmations (Every 5-8 seconds)
    setInterval(() => this.emitConfirmation(), 6000);

    // 3. Telemetry/Risk Metrics (Every 2 seconds)
    setInterval(() => this.emitTelemetry(), 2000);
  }

  private emitProfitDrop() {
    const pairs = ['WETH/USDC', 'WBTC/DAI', 'MATIC/USDT', 'LINK/ETH', 'AAVE/USDC'];
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const profit = (Math.random() * 500 + 50).toFixed(2);
    
    this.wsServer.broadcast({
      type: MessageType.PROFIT_DROP,
      timestamp: new Date().toISOString(),
      payload: {
        pair,
        profit: parseFloat(profit),
        strategy: 'Triangular Arbitrage',
        executionTimeMs: Math.floor(Math.random() * 50) + 10,
        txHash: this.generateTxHash()
      }
    });
  }

  private emitConfirmation() {
    const profit = (Math.random() * 500 + 50).toFixed(2);
    this.wsServer.broadcast({
      type: MessageType.CONFIRMATION,
      timestamp: new Date().toISOString(),
      payload: {
        amount: parseFloat(profit),
        status: 'CONFIRMED',
        blockNumber: 18450000 + Math.floor(Math.random() * 1000),
        txHash: this.generateTxHash()
      }
    });
  }

  private emitTelemetry() {
    // Real-time risk and infra metrics for the Right Sidebar
    this.wsServer.broadcast({
      type: MessageType.TELEMETRY,
      timestamp: new Date().toISOString(),
      payload: {
        risk: {
          var99: Math.floor(Math.random() * (550 - 400 + 1)) + 400,
          sortino: parseFloat((Math.random() * (3.5 - 2.8) + 2.8).toFixed(2)),
          portfolioDelta: parseFloat((Math.random() * 0.02 - 0.01).toFixed(4)),
        },
        infra: {
          latency: Math.floor(Math.random() * (60 - 35 + 1)) + 35,
          activeShards: 8,
          kafkaStatus: 'Healthy'
        }
      }
    });
  }

  private generateTxHash(): string {
    return '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
  }
}