
// In a real application, you would use the @google/genai library.
// import { GoogleGenAI, Type } from '@google/genai';

// Service for AI-powered strategy optimization using Gemini API

export interface OptimizationResult {
  suggestion: string;
  confidence: number;
  expectedProfit: number;
  parameters: Record<string, number | string>;
}

export const getStrategyOptimization = async (
  prompt: string
): Promise<OptimizationResult> => {
  try {
    console.log("Calling AI optimization service with prompt:", prompt);

    const response = await fetch('http://localhost:3002/optimize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`AI service returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("AI optimization response:", result);
    return result;
  } catch (error) {
    console.error("Error calling AI optimization service:", error);
    throw error;
  }
};

export const getTerminalResponse = async (command: string): Promise<string> => {
  try {
    const response = await fetch('http://localhost:8080/terminal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    const data = await response.json();
    return data.response;
  } catch (error) {
    return 'Error connecting to terminal service.';
  }
};
