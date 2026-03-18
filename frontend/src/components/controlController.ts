import { Request, Response } from 'express';

// This is a mock service that would interact with a database
const matrixDbService = {
  persistConfiguration: async (config: any) => {
    console.log('[DB] Persisting Matrix Configuration...');
    // In a real app, this would perform an upsert operation for each collection/table.
    // For example, using a Prisma transaction:
    // await prisma.$transaction([
    //   ...config.strategies.map(s => prisma.strategy.upsert({ where: { id: s.id }, update: s, create: s })),
    //   ...config.dexs.map(d => prisma.dex.upsert({ where: { id: d.id }, update: d, create: d })),
    //   ...
    // ])
    console.log(`[DB] Saved ${config.strategies?.length || 0} strategies.`);
    console.log(`[DB] Saved ${config.dexs?.length || 0} DEXs.`);
    console.log(`[DB] Saved ${config.pairs?.length || 0} pairs.`);
    console.log(`[DB] Saved ${config.providers?.length || 0} providers.`);
    console.log(`[DB] Saved ${config.blockchains?.length || 0} blockchains.`);
    return { status: 'success', message: 'Matrix configuration persisted.' };
  }
};

// This is a mock service that would interact with the core trading engine/orchestrator
const tradingEngineService = {
  setCapitalVelocity: async (value: number) => {
    console.log(`[CONTROL] Setting capital velocity to ${value}%`);
    // In a real app, this would publish an event to Kafka or call another microservice
    return { status: 'success', velocity: value };
  },
  setReinvestmentRate: async (value: number) => {
    console.log(`[CONTROL] Setting reinvestment rate to ${value}%`);
    return { status: 'success', rate: value };
  },
  toggleStrategy: async (strategyId: string, active: boolean) => {
    console.log(`[CONTROL] Setting strategy '${strategyId}' to active=${active}`);
    return { status: 'success', strategyId, active };
  },
  triggerEmergencyStop: async () => {
    console.error(`[CONTROL] 🚨 EMERGENCY STOP TRIGGERED! Halting all trading activity.`);
    return { status: 'success', message: 'Emergency stop initiated.' };
  },
};

export const setCapitalVelocity = async (req: Request, res: Response) => {
  const { value } = req.body;
  if (typeof value !== 'number' || value < 0 || value > 100) {
    return res.status(400).json({ error: 'Invalid value. Must be a number between 0 and 100.' });
  }
  try {
    const result = await tradingEngineService.setCapitalVelocity(value);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to set capital velocity.' });
  }
};

export const setReinvestmentRate = async (req: Request, res: Response) => {
  const { value } = req.body;
  if (typeof value !== 'number' || value < 0 || value > 100) {
    return res.status(400).json({ error: 'Invalid value. Must be a number between 0 and 100.' });
  }
  try {
    const result = await tradingEngineService.setReinvestmentRate(value);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to set reinvestment rate.' });
  }
};

export const toggleStrategy = async (req: Request, res: Response) => {
  const { strategyId } = req.params;
  const { active } = req.body;
  const validStrategies = ['spot', 'gamma', 'perp', 'options'];

  if (!validStrategies.includes(strategyId)) {
    return res.status(400).json({ error: 'Invalid strategy ID.' });
  }
  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'Invalid active state. Must be a boolean.' });
  }

  try {
    await tradingEngineService.toggleStrategy(strategyId, active);
    res.status(200).json({ status: 'success', strategyId, active });
  } catch (error) {
    res.status(500).json({ error: `Failed to toggle strategy ${strategyId}.` });
  }
};

export const emergencyStop = async (req: Request, res: Response) => {
  try {
    await tradingEngineService.triggerEmergencyStop();
    res.status(200).json({ status: 'success', message: 'Emergency stop triggered. System is halting.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger emergency stop.' });
  }
};

export const saveMatrixConfiguration = async (req: Request, res: Response) => {
  const configuration = req.body;
  // Basic validation
  if (!configuration || typeof configuration !== 'object') {
    return res.status(400).json({ error: 'Invalid configuration payload.' });
  }
  try {
    const result = await matrixDbService.persistConfiguration(configuration);
    res.status(200).json(result);
  } catch (error) {
    console.error('[CONTROL] Failed to save matrix configuration:', error);
    res.status(500).json({ error: 'Failed to save matrix configuration.' });
  }
};