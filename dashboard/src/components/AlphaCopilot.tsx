import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Brain, 
  Zap, 
  Target, 
  Activity, 
  Send,
  MessageSquare,
  Sparkles,
  Cpu,
  BarChart3,
  Shield,
  Globe,
  X,
  ChevronDown,
  MoreVertical,
  Copy,
  RefreshCw,
  TrendingUp,
  Wallet,
  Settings,
  Hexagon
} from 'lucide-react';
import { sendChatMessage, getSimulatedResponse } from '../services/openaiService';

// Chat message types
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

// Quick action buttons for the copilot
interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

const AlphaCopilot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '👋 Hello! I\'m Alpha-Copilot, your AI-powered arbitrage trading assistant.\n\nI can help you with:\n• Analyzing market opportunities\n• Monitoring performance metrics\n• Optimizing trade execution\n• Checking wallet balances\n• Reviewing strategy performance\n\nHow can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Quick action buttons
  const quickActions: QuickAction[] = [
    {
      id: 'opportunities',
      label: 'Find Opportunities',
      icon: <Zap size={14} />,
      prompt: 'What are the current arbitrage opportunities?'
    },
    {
      id: 'performance',
      label: 'Check Performance',
      icon: <TrendingUp size={14} />,
      prompt: 'Show me the current performance metrics'
    },
    {
      id: 'wallets',
      label: 'Wallet Status',
      icon: <Wallet size={14} />,
      prompt: 'What are the current wallet balances?'
    },
    {
      id: 'strategies',
      label: 'Strategy Info',
      icon: <Brain size={14} />,
      prompt: 'Tell me about the active strategies'
    },
    {
      id: 'optimize',
      label: 'Optimize',
      icon: <Settings size={14} />,
      prompt: 'What optimizations are available?'
    },
    {
      id: 'benchmark',
      label: 'Benchmark',
      icon: <Target size={14} />,
      prompt: 'How do we compare to benchmarks?'
    }
  ];

  // Simulated AI responses based on user input
  const generateResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('opportunity') || input.includes('arbitrage') || input.includes('profit')) {
      return `📊 **Current Arbitrage Opportunities**\n\nI've detected several opportunities:\n\n**1. Tri-Arb on ETH/ARB**\n• Spread: 0.85%\n• Potential profit: ~$4,500\n• Confidence: 94%\n\n**2. Cross-Chain on WBTC**\n• Spread: 0.42%\n• Potential profit: ~$2,100\n• Confidence: 87%\n\n**3. Flash Loan on Uniswap**\n• Spread: 0.28%\n• Potential profit: ~$1,400\n• Confidence: 91%\n\nWould you like me to execute any of these?`;
    }
    
    if (input.includes('performance') || input.includes('metric') || input.includes('stat')) {
      return `📈 **Current Performance Metrics**\n\n| Metric | Value | Change |\n|--------|-------|--------|\n| Profit/Trade | $145.50 | +2.3% |\n| Trades/Hour | 12 | +1 |\n| Latency | 42ms | -3ms |\n| Success Rate | 98.2% | +0.5% |\n| Capital Velocity | 85% | Stable |\n\nThe optimization engine is running at 85% efficiency.`;
    }
    
    if (input.includes('wallet') || input.includes('balance') || input.includes('fund')) {
      return `💰 **Wallet Status**\n\n| Wallet | Balance | Chain | Status |\n|--------|---------|-------|--------|\n| Main Treasury | 125.45 ETH | Ethereum | ✅ Valid |\n| Execution Wallet | 5.20 ETH | Arbitrum | ✅ Valid |\n| Cold Storage | 1,050.00 ETH | Ethereum | ✅ Valid |\n\n**Total: 1,180.65 ETH** (~$3.8M)`;
    }
    
    if (input.includes('strategy') || input.includes('strategies')) {
      return `🧠 **Active Strategies**\n\n**1. Flash Loan Tri-Arb** (35% allocation)\n• Status: Active\n• Performance: +$145/tx\n\n**2. Cross-Chain Arbitrage** (25% allocation)\n• Status: Active\n• Performance: +$89/tx\n\n**3. Liquidations** (18% allocation)\n• Status: Active\n• Performance: +$230/tx\n\n**4. MEV Protection** (12% allocation)\n• Status: Active\n• Savings: 15% gas\n\n**5. Statistical Arb** (10% allocation)\n• Status: Optimizing\n• Performance: +$45/tx`;
    }
    
    if (input.includes('optimize') || input.includes('optimization') || input.includes('improve')) {
      return `⚡ **Available Optimizations**\n\n**Gas Optimization:**\n• Using Pimlico → Save 23% gas\n• Current avg: 85 gwei → Target: 65 gwei\n\n**Route Optimization:**\n• Uniswap V3 → 94% efficiency\n• Sushiswap → 89% efficiency\n\n**Pool Selection:**\n• Current: Top 5 pools\n• Recommendation: Add Curve pool\n\nShould I apply these optimizations?`;
    }
    
    if (input.includes('benchmark') || input.includes('compare') || input.includes('wintermute')) {
      return `🎯 **Benchmark Comparison**\n\n| Metric | Alpha-Orion | Wintermute | 1inch |\n|--------|-------------|------------|-------|\n| Latency | 42ms | 50ms | 55ms |\n| Success Rate | 98.2% | 97.5% | 96.8%\n| Gas Cost | 85 gwei | 92 gwei | 88 gwei |\n| Profit/tx | $145 | $132 | $128 |\n\n**Alpha-Orion is outperforming all benchmarks!** 🚀`;
    }
    
    if (input.includes('help') || input.includes('what can')) {
      return `🤖 **I can help you with:**\n\n• **Market Analysis** - Find arbitrage opportunities\n• **Performance** - Monitor trading metrics\n• **Wallets** - Check balances and status\n• **Strategies** - Review active strategies\n• **Optimization** - Improve execution\n• **Benchmarks** - Compare performance\n\nJust ask me anything about your arbitrage trading!`;
    }
    
    // Default response
    return `I understand you're asking about: "${userInput}"\n\nI can provide detailed analysis on:\n• Arbitrage opportunities\n• Performance metrics\n• Wallet status\n• Trading strategies\n• System optimizations\n• Benchmark comparisons\n\nWhat specific information would you like to know?`;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setShowQuickActions(false);
    setIsTyping(true);

    try {
      // Call OpenAI backend
      const aiResponse = await sendChatMessage(inputValue);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      // Fallback to simulated response on error
      const aiResponse = getSimulatedResponse(inputValue);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = async (action: QuickAction) => {
    setInputValue(action.prompt);
    setShowQuickActions(false);
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: action.prompt,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Call OpenAI backend
      const aiResponse = await sendChatMessage(action.prompt);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      // Fallback to simulated response on error
      const aiResponse = getSimulatedResponse(action.prompt);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col bg-slate-950/95">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg shadow-lg shadow-purple-500/20">
                <Bot size={20} className="text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Alpha-Copilot
                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded">AI</span>
              </h2>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Sparkles size={10} className="text-purple-400" />
                OpenAI Powered • Online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setMessages([{
                id: '1',
                role: 'assistant',
                content: '👋 Hello! I\'m Alpha-Copilot, your AI-powered arbitrage trading assistant.\n\nI can help you with:\n• Analyzing market opportunities\n• Monitoring performance metrics\n• Optimizing trade execution\n• Checking wallet balances\n• Reviewing strategy performance\n\nHow can I assist you today?',
                timestamp: new Date()
              }])}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="New Chat"
            >
              <RefreshCw size={14} />
            </button>
            <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <MoreVertical size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div 
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' 
                  ? 'bg-blue-600' 
                  : 'bg-gradient-to-br from-purple-600 to-blue-600'
              }`}>
                {message.role === 'user' ? (
                  <span className="text-white text-xs font-bold">You</span>
                ) : (
                  <Bot size={14} className="text-white" />
                )}
              </div>
              
              {/* Message Bubble */}
              <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-slate-800 text-slate-200 rounded-bl-md'
                }`}>
                  <p className="text-xs leading-relaxed whitespace-pre-line">{message.content}</p>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-2 max-w-[85%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-slate-800 rounded-2xl rounded-bl-md p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions (shown when no messages or first interaction) */}
      {showQuickActions && messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 hover:border-purple-500/30 rounded-full text-xs text-slate-300 transition-all hover:scale-105"
              >
                <span className="text-purple-400">{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-white/5 bg-slate-900/50">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Alpha-Copilot anything..."
              className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 resize-none"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:shadow-none disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-2 text-center">
          Press Enter to send • Alpha-Copilot uses OpenAI
        </p>
      </div>
    </div>
  );
};

export default AlphaCopilot;
