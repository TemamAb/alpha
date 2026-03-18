import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader2, Brain, Zap, Trash2, Sparkles, ShieldAlert, TrendingUp, Activity } from 'lucide-react';
import { useAlphaOrionStore } from '../hooks/useAlphaOrionStore';
import { sendChatMessage, getSimulatedResponse } from '../services/openaiService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const NeuralAdvisor: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get real-time data from Alpha-Orion store
  const { profitData, opportunities, systemHealth, pimlicoStatus } = useAlphaOrionStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Greetings, Alpha-Orion Operator. I am your Neural Intelligence Core v3.0, specialized in institutional arbitrage strategies.

Current System Status:
• Total PnL: $${profitData?.totalPnL?.toLocaleString() || '0'}
• Active Opportunities: ${opportunities.filter(o => o.status === 'pending').length}
• System Mode: ${systemHealth?.mode || 'UNKNOWN'}
• Gasless Transactions: ${pimlicoStatus?.transactionsProcessed || 0}

How may I assist with your arbitrage operations today?`,
        timestamp: new Date()
      }]);
    }
  }, [profitData, opportunities, systemHealth, pimlicoStatus]);

  const handleClearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `Greetings, Alpha-Orion Operator. I am your Neural Intelligence Core v3.0, specialized in institutional arbitrage strategies.

Current System Status:
• Total PnL: $${profitData?.totalPnL?.toLocaleString() || '0'}
• Active Opportunities: ${opportunities.filter(o => o.status === 'pending').length}
• System Mode: ${systemHealth?.mode || 'UNKNOWN'}
• Gasless Transactions: ${pimlicoStatus?.transactionsProcessed || 0}

How may I assist with your arbitrage operations today?`,
      timestamp: new Date()
    }]);
  };

  const quickPrompts = [
    { icon: <Brain size={12} />, label: 'Optimize Strategies', query: 'Analyze current arbitrage strategies and suggest algorithmic improvements for higher win rates.' },
    { icon: <Zap size={12} />, label: 'Reduce Latency', query: 'Analyze network hops and mempool detection speed. Suggest infrastructure changes to reduce execution latency.' },
    { icon: <Activity size={12} />, label: 'Capital Velocity', query: 'Evaluate capital utilization rates. How can we increase capital turnover and velocity?' },
    { icon: <TrendingUp size={12} />, label: 'Max Profit/Trade', query: 'Analyze recent trade margins. Suggest parameters to filter for higher profit-per-trade opportunities.' },
    { icon: <Sparkles size={12} />, label: 'Boost Trades/Min', query: 'Review opportunity filtering logic. How can we safely increase trade frequency (trades per minute)?' },
    { icon: <TrendingUp size={12} />, label: 'Minimize Slippage', query: 'Analyze recent execution slippage. Suggest DEX routing optimizations and tolerance settings to minimize price impact.' },
    { icon: <ShieldAlert size={12} />, label: 'MEV Protection', query: 'Scan for front-running and sandwich attacks. Verify Flashbots/Private RPC configuration for maximum MEV resistance.' },
    { icon: <ShieldAlert size={12} />, label: 'Simulate Attack', query: 'SIMULATION MODE: Simulate a sandwich attack on a pending arbitrage transaction. Describe the detection steps and the specific defensive actions (e.g., private RPC routing, slippage tightening) the bot takes.' }
  ];

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || isProcessing) return;

    const userMessage: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      // Send message to OpenAI backend service
      const response = await sendChatMessage(textToSend, {
        profitData,
        opportunities,
        systemHealth,
        pimlicoStatus
      });

      const aiMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Neural Link Failure:", error);
      // Fallback to simulated response
      const fallbackResponse = getSimulatedResponse(textToSend);
      const aiMessage: Message = {
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(undefined);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[700px] flex flex-col bg-slate-900 border border-white/20 rounded-[2.5rem] overflow-hidden shadow-2xl animate-fade-in">
      {/* Header */}
      <div className="p-6 border-b border-white/20 bg-slate-950 flex justify-between items-center">
        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic flex items-center gap-2">
          <Brain size={14} className="text-purple-400" />
          Neural Intelligence Core v3.0
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">ONLINE</span>
          </div>
          <button 
            onClick={handleClearChat}
            className="text-slate-500 hover:text-red-400 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-950/20">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed border-2 shadow-lg ${
              message.role === 'user'
                ? 'bg-blue-600 border-blue-400 text-white'
                : 'bg-slate-800 border-white/20 text-white'
            }`}>
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className={`text-[10px] mt-2 font-bold uppercase tracking-widest ${
                message.role === 'user' ? 'text-blue-200' : 'text-slate-400'
              }`}>
                {message.timestamp.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border-2 border-white/20 p-4 rounded-2xl shadow-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin text-purple-400" size={16} />
                <span className="text-sm text-slate-300">Processing neural pathways...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-white/20 flex flex-col gap-4 bg-slate-950">
        {/* Quick Prompts */}
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt.query)}
              disabled={isProcessing}
              className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-white/10 rounded-lg hover:bg-purple-900/20 hover:border-purple-500/30 transition-all shrink-0 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-slate-400 group-hover:text-purple-400 transition-colors">{prompt.icon}</span>
              <span className="text-[10px] font-bold text-slate-300 group-hover:text-white uppercase tracking-wider transition-colors">{prompt.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-4">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isProcessing}
            className="w-full bg-slate-800 border-2 border-white/20 rounded-xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder:text-slate-500 disabled:opacity-50 font-mono resize-none"
            placeholder="Inquire about arbitrage strategies, MEV protection, or system optimization..."
            rows={2}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <Zap size={12} className="text-purple-400" />
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
              AI-POWERED
            </span>
          </div>
        </div>
        <button
          onClick={() => handleSendMessage(undefined)}
          disabled={isProcessing || !input.trim()}
          className="bg-purple-600 text-white p-4 rounded-xl hover:bg-purple-500 transition-all disabled:bg-slate-700 shadow-lg border border-purple-400 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
        </div>
      </div>
    </div>
  );
};

export default NeuralAdvisor;
