const { expect } = require('chai');
const sinon = require('sinon');
const { ethers } = require('ethers');
const EnterpriseProfitEngine = require('./enterprise-profit-engine');
const MultiChainArbitrageEngine = require('./multi-chain-arbitrage-engine');
const MEVRouter = require('./mev-router');

describe('EnterpriseProfitEngine', () => {
    let profitEngine;
    let mockMultiChainEngine;
    let mockMevRouter;
    let mockRiskEngine;

    beforeEach(() => {
        // Mock dependencies
        mockMevRouter = sinon.createStubInstance(MEVRouter);
        mockMultiChainEngine = sinon.createStubInstance(MultiChainArbitrageEngine);
        mockMultiChainEngine.chains = {
            ethereum: {
                name: 'Ethereum',
                dexes: ['uniswap', 'sushiswap'],
            },
        };
        mockMultiChainEngine.providers = {
            ethereum: sinon.stub(),
        };

        mockRiskEngine = {
            evaluateTradeOpportunity: sinon.stub().returns({ approved: true }),
        };

        profitEngine = new EnterpriseProfitEngine(mockMultiChainEngine, mockMevRouter);
        profitEngine.setRiskEngine(mockRiskEngine);

        // Stub placeholder methods that are not under test
        sinon.stub(profitEngine, 'findTriangularArbitrage').resolves([]);
        sinon.stub(profitEngine, 'findCrossDexArbitrage').resolves([]);
        sinon.stub(profitEngine, 'findCrossChainArbitrage').resolves([]);
        sinon.stub(profitEngine, 'findLiquidityPoolArbitrage').resolves([]);
        sinon.stub(profitEngine, 'findMEVOpportunities').resolves([]);
        sinon.stub(profitEngine, 'estimateGasCost').resolves(150000);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('Statistical Arbitrage Strategy', () => {
        it('should identify a mean-reversion opportunity when z-score exceeds threshold', async () => {
            // Mock price history to create a clear deviation
            const pricesA = Array.from({ length: 99 }, () => 2000);
            pricesA.push(2100); // Recent price deviates significantly
            const pricesB = Array.from({ length: 100 }, () => 2000);

            const getPriceHistoryStub = sinon.stub(profitEngine, 'getPriceHistory');
            getPriceHistoryStub.withArgs('WETH').resolves(pricesA);
            getPriceHistoryStub.withArgs('stETH').resolves(pricesB);

            // Mock profit calculation to be predictable
            sinon.stub(profitEngine, 'calculateStatArbProfit').resolves(ethers.utils.parseEther('0.5'));

            const opportunities = await profitEngine.findStatisticalArbitrage();

            expect(opportunities).to.have.lengthOf(1);
            const opp = opportunities[0];
            expect(opp.strategy).to.equal('statistical');
            expect(opp.assets).to.deep.equal(['WETH', 'stETH']);
            expect(opp.direction).to.equal('SHORT_SPREAD'); // WETH is overpriced, so we short it
            expect(opp.potentialProfit).to.be.gt(0);
            expect(opp.zScore).to.be.a('number');
            expect(Math.abs(opp.zScore)).to.be.gt(2.0); // The pair's threshold
        });

        it('should not identify an opportunity if z-score is within threshold', async () => {
            // Mock price history with no significant deviation
            const pricesA = Array.from({ length: 100 }, () => 2000 + (Math.random() - 0.5) * 5);
            const pricesB = Array.from({ length: 100 }, () => 2000 + (Math.random() - 0.5) * 5);

            const getPriceHistoryStub = sinon.stub(profitEngine, 'getPriceHistory');
            getPriceHistoryStub.withArgs('WETH').resolves(pricesA);
            getPriceHistoryStub.withArgs('stETH').resolves(pricesB);

            const opportunities = await profitEngine.findStatisticalArbitrage();

            expect(opportunities).to.have.lengthOf(0);
        });
    });

    describe('Order Flow Arbitrage Strategy', () => {
        it('should identify an opportunity when there is a significant buy-side imbalance', async () => {
            // Mock an order book with heavy buy-side volume
            const imbalancedOrderBook = {
                bids: Array.from({ length: 10 }, (_, i) => ({ price: 2000 - i, amount: 20 })), // High bid volume
                asks: Array.from({ length: 10 }, (_, i) => ({ price: 2001 + i, amount: 2 })),  // Low ask volume
            };
            sinon.stub(profitEngine, 'getOrderBook').resolves(imbalancedOrderBook);
            sinon.stub(profitEngine, 'calculateOrderFlowProfit').resolves(ethers.utils.parseEther('0.2'));

            const opportunities = await profitEngine.findOrderFlowArbitrage();

            expect(opportunities).to.have.lengthOf(1);
            const opp = opportunities[0];
            expect(opp.strategy).to.equal('order_flow');
            expect(opp.chain).to.equal('ethereum');
            expect(opp.direction).to.equal('MARKET_SELL'); // High bid volume means we should sell into it
            expect(opp.imbalance).to.be.gt(0.3); // Check for significant imbalance
            expect(opp.potentialProfit).to.be.gt(0);
        });

        it('should identify an opportunity when there is a significant sell-side imbalance', async () => {
            // Mock an order book with heavy sell-side volume
            const imbalancedOrderBook = {
                bids: Array.from({ length: 10 }, (_, i) => ({ price: 2000 - i, amount: 2 })),  // Low bid volume
                asks: Array.from({ length: 10 }, (_, i) => ({ price: 2001 + i, amount: 20 })), // High ask volume
            };
            sinon.stub(profitEngine, 'getOrderBook').resolves(imbalancedOrderBook);
            sinon.stub(profitEngine, 'calculateOrderFlowProfit').resolves(ethers.utils.parseEther('0.2'));

            const opportunities = await profitEngine.findOrderFlowArbitrage();

            expect(opportunities).to.have.lengthOf(1);
            const opp = opportunities[0];
            expect(opp.strategy).to.equal('order_flow');
            expect(opp.direction).to.equal('MARKET_BUY'); // High ask volume means we should buy into it
            expect(opp.imbalance).to.be.lt(-0.3);
        });

        it('should not identify an opportunity for a balanced order book', async () => {
            const balancedOrderBook = {
                bids: Array.from({ length: 10 }, (_, i) => ({ price: 2000 - i, amount: 10 })),
                asks: Array.from({ length: 10 }, (_, i) => ({ price: 2001 + i, amount: 10 })),
            };
            sinon.stub(profitEngine, 'getOrderBook').resolves(balancedOrderBook);

            const opportunities = await profitEngine.findOrderFlowArbitrage();

            expect(opportunities).to.have.lengthOf(0);
        });
    });

    describe('generateProfitOpportunities', () => {
        it('should call all strategy finders and return a combined list of opportunities', async () => {
            // Restore stubs for this test
            profitEngine.findTriangularArbitrage.restore();
            profitEngine.findCrossDexArbitrage.restore();
            profitEngine.findStatisticalArbitrage.restore();
            profitEngine.findOrderFlowArbitrage.restore();

            // Setup stubs to return one opportunity each
            sinon.stub(profitEngine, 'findTriangularArbitrage').resolves([{ id: 'tri-1', potentialProfit: 10, strategy: 'triangular' }]);
            sinon.stub(profitEngine, 'findCrossDexArbitrage').resolves([{ id: 'cross-dex-1', potentialProfit: 20, strategy: 'cross_dex' }]);
            sinon.stub(profitEngine, 'findStatisticalArbitrage').resolves([{ id: 'stat-1', potentialProfit: 30, strategy: 'statistical' }]);
            sinon.stub(profitEngine, 'findOrderFlowArbitrage').resolves([{ id: 'order-flow-1', potentialProfit: 40, strategy: 'order_flow' }]);

            // Mock the ML filtering to just pass through
            sinon.stub(profitEngine, 'filterAndRankOpportunities').callsFake(async (opps) => opps);

            const opportunities = await profitEngine.generateProfitOpportunities();

            expect(opportunities).to.have.lengthOf(4);
            expect(profitEngine.findTriangularArbitrage.calledOnce).to.be.true;
            expect(profitEngine.findCrossDexArbitrage.calledOnce).to.be.true;
            expect(profitEngine.findStatisticalArbitrage.calledOnce).to.be.true;
            expect(profitEngine.findOrderFlowArbitrage.calledOnce).to.be.true;
        });
    });
});