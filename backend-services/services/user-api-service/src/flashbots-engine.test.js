const { expect } = require('chai');
const sinon = require('sinon');
const { ethers } = require('ethers');
const { FlashbotsBundleProvider } = require('@flashbots/ethers-provider-bundle');
const FlashbotsEngine = require('../src/flashbots-engine');

describe('FlashbotsEngine', () => {
  let flashbotsEngine;
  let createStub;
  let mockBundleProvider;

  beforeEach(() => {
    process.env.PRIVATE_KEY = '0x' + '1'.repeat(64);
    process.env.ETHEREUM_RPC_URL = 'https://fake-rpc.com';

    // Mock the FlashbotsBundleProvider
    mockBundleProvider = {
      signBundle: sinon.stub().resolves('signedBundle'),
      simulate: sinon.stub().resolves({ results: [] }), // Successful simulation
      sendBundle: sinon.stub().resolves({
        wait: () => Promise.resolve({ status: 1, transactionHash: '0xBundleTxHash' }),
      }),
    };

    createStub = sinon.stub(FlashbotsBundleProvider, 'create').resolves(mockBundleProvider);

    flashbotsEngine = new FlashbotsEngine();
  });

  afterEach(() => {
    sinon.restore();
    delete process.env.PRIVATE_KEY;
    delete process.env.ETHEREUM_RPC_URL;
  });

  it('should throw an error if PRIVATE_KEY is not set', () => {
    delete process.env.PRIVATE_KEY;
    expect(() => new FlashbotsEngine()).to.throw('PRIVATE_KEY and ETHEREUM_RPC_URL must be set in environment variables.');
  });

  it('should throw an error if ETHEREUM_RPC_URL is not set', () => {
    delete process.env.ETHEREUM_RPC_URL;
    expect(() => new FlashbotsEngine()).to.throw('PRIVATE_KEY and ETHEREUM_RPC_URL must be set in environment variables.');
  });

  it('should throw an error if initialization fails', async () => {
    createStub.rejects(new Error('Failed to create provider'));
    await expect(flashbotsEngine.initialize()).to.be.rejectedWith('Failed to create provider');
  });

  it('should initialize the FlashbotsBundleProvider on first use', async () => {
    await flashbotsEngine.initialize();
    expect(createStub.calledOnce).to.be.true;
    expect(flashbotsEngine.bundleProvider).to.equal(mockBundleProvider);

    // Second call should not re-initialize
    await flashbotsEngine.initialize();
    expect(createStub.calledOnce).to.be.true;
  });

  describe('submitBundle', () => {
    it('should successfully simulate and submit a bundle', async () => {
      const transactions = [{ signedTransaction: '0xSignedTx1' }];
      const getBlockNumberStub = sinon.stub(flashbotsEngine.publicProvider, 'getBlockNumber').resolves(100);

      const result = await flashbotsEngine.submitBundle(transactions);

      expect(result.status).to.equal('success');
      expect(result.method).to.equal('flashbots');
      expect(result.mevProtected).to.be.true;
      expect(result.targetBlock).to.equal(101);
      expect(result.receipt).to.deep.equal({ status: 1, transactionHash: '0xBundleTxHash' });

      // Verify calls
      expect(createStub.calledOnce).to.be.true;
      expect(getBlockNumberStub.calledOnce).to.be.true;
      expect(mockBundleProvider.signBundle.calledWith(transactions)).to.be.true;
      expect(mockBundleProvider.simulate.calledWith('signedBundle', 101)).to.be.true;
      expect(mockBundleProvider.sendBundle.calledWith('signedBundle', 101)).to.be.true;
    });

    it('should return a failure status if simulation fails', async () => {
      const transactions = [{ signedTransaction: '0xSignedTx1' }];
      sinon.stub(flashbotsEngine.publicProvider, 'getBlockNumber').resolves(100);

      // Make simulation fail
      mockBundleProvider.simulate.resolves({ error: { message: 'Simulation failed' } });

      const result = await flashbotsEngine.submitBundle(transactions);

      expect(result.status).to.equal('failed');
      expect(result.error).to.equal('Simulation failed');

      // sendBundle should not be called
      expect(mockBundleProvider.sendBundle.called).to.be.false;
    });

    it('should throw an error if sendBundle fails', async () => {
      const transactions = [{ signedTransaction: '0xSignedTx1' }];
      sinon.stub(flashbotsEngine.publicProvider, 'getBlockNumber').resolves(100);

      // Make sendBundle fail
      mockBundleProvider.sendBundle.rejects(new Error('Relay connection error'));

      try {
        await flashbotsEngine.submitBundle(transactions);
        expect.fail('Expected submitBundle to throw');
      } catch (error) {
        expect(error.message).to.equal('Relay connection error');
      }
    });
  });
});