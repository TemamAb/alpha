const API_BASE = '/api'; // Backend server
const STATUS_INTERVAL = 5000; // 5s poll

class ArbitrageDashboard {&#10;    constructor() {&#10;        this.wallet = {balance: 0, mode: 'manual', threshold: 0.1};&#10;        this.stats = {
    constructor() {
        this.stats = {
            totalProfit: 0,
            trades: 0,
            winRate: 0,
            activeOpps: [],
            recentTrades: []
        };
        this.init();
    }

    init() {
        this.render();
        this.startPolling();
        this.setupCharts();
    }

    async pollStats() {
        try {
            const resp = await fetch(`${API_BASE}/stats`);
            const data = await resp.json();
            this.stats = { ...this.stats, ...data };
            this.render();
            this.updateCharts();
        } catch(e) {
            console.error('Poll failed:', e);
        }
    }

    startPolling() {
        setInterval(() => this.pollStats(), STATUS_INTERVAL);
    }

    setupCharts() {
        this.profitChart = new Chart(document.getElementById('profitChart'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Cumulative PnL', data: [] }] },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
        
        this.winChart = new Chart(document.getElementById('winChart'), {
            type: 'doughnut',
            data: { labels: ['Wins', 'Losses'], datasets: [{ data: [0,0] }] }
        });
    }

    updateCharts() {
        this.profitChart.data.labels.push(new Date().toLocaleTimeString());
        this.profitChart.data.datasets[0].data.push(this.stats.totalProfit);
        if (this.profitChart.data.labels.length > 50) {
            this.profitChart.data.labels.shift();
            this.profitChart.data.datasets[0].data.shift();
        }
        this.profitChart.update();

        this.winChart.data.datasets[0].data = [this.stats.wins, this.stats.losses];
        this.winChart.update();
    }

    render() {
        document.getElementById('total-profit').textContent = `$${this.stats.totalProfit.toFixed(2)}`;
        document.getElementById('trade-count').textContent = this.stats.trades;
        document.getElementById('win-rate').textContent = `${this.stats.winRate.toFixed(1)}%`;
        
        const oppsList = document.getElementById('active-opps');
        oppsList.innerHTML = this.stats.activeOpps.map(opp => 
            `<li>${opp.chain}: ${opp.profit?.toFixed(4)} ${opp.token}</li>`
        ).join('') || '<li>No active opportunities</li>';
        
        const tradesList = document.getElementById('recent-trades');
        tradesList.innerHTML = this.stats.recentTrades.slice(-5).map(trade => 
            `<li>${trade.timestamp}: ${trade.pnl > 0 ? '+' : ''}${trade.pnl.toFixed(2)}</li>`
        ).join('');
    }
}

// Production WebSocket real-time updates
const ws = new WebSocket('ws://localhost:3000');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    dashboard.stats = { ...dashboard.stats, ...data };
    dashboard.render();
    dashboard.updateCharts();
};

// Init
const dashboard = new ArbitrageDashboard();

// Auto-refresh every 30s full reload fallback
setInterval(() => location.reload(), 30000);

// PWA service worker for offline
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}
