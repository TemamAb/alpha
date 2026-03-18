import React, { useState } from 'react';
import { Send, Bot } from 'lucide-react';

const NeuralAdvisor: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: 'I am the Neural Advisor. How can I optimize your strategy today?' }
  ]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    // Mock AI response for UI demonstration
    setTimeout(() => {
        setMessages(prev => [...prev, { role: 'ai', content: `Analyzing market conditions for "${input}"... Recommendation: Increase capital velocity by 5% due to low volatility.` }]);
    }, 1000);
    setInput('');
  };

  return (
    <div className="flex-grow flex flex-col bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center gap-2">
        <Bot className="text-purple-500" size={20} />
        <h2 className="font-bold text-gray-200">Neural Advisor (OpenAI GPT-4)</h2>
      </div>
      
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-gray-800 text-gray-300 rounded-bl-none'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask for strategy optimization..."
            className="flex-grow bg-black/30 border border-gray-700 rounded px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500"
          />
          <button 
            onClick={handleSend}
            className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NeuralAdvisor;