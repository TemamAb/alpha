
import React, { useState, useRef, useEffect } from 'react';
import { TerminalLine } from '../types';
import { getTerminalResponse } from '../services/openaiService';
import { Bot, ChevronRight, CornerDownLeft } from 'lucide-react';

const WelcomeMessage: TerminalLine = {
  type: 'output',
  content: `Alpha-Orion Command-Line Interface.
Type 'help' for a list of commands.`,
  timestamp: new Date().toLocaleTimeString(),
};

const Terminal: React.FC = () => {
  const [lines, setLines] = useState<TerminalLine[]>([WelcomeMessage]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const endOfLinesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfLinesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const addLine = (line: Omit<TerminalLine, 'timestamp'>) => {
    setLines(prev => [...prev, { ...line, timestamp: new Date().toLocaleTimeString() }]);
  };

  const handleCommand = async (command: string) => {
    setIsProcessing(true);
    addLine({ type: 'input', content: command });

    if (command.toLowerCase().trim() === 'clear') {
      setLines([
        {
          type: 'output',
          content: 'Terminal cleared.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } else {
      try {
        const response = await getTerminalResponse(command);
        addLine({ type: 'output', content: response });
      } catch (error) {
        addLine({ type: 'error', content: 'Error processing command.' });
      }
    }
    setIsProcessing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      handleCommand(input.trim());
      setInput('');
    }
  };

  const renderLine = (line: TerminalLine) => {
    const lineClasses = {
      input: 'text-blue-400',
      output: 'text-gray-300',
      error: 'text-red-400',
    };

    return (
      <div key={`${line.timestamp}-${line.content.slice(0, 10)}`} className="flex text-sm">
        <span className="text-gray-600 mr-4">{line.timestamp}</span>
        <div className="flex-shrink-0">
          {line.type === 'input' && <ChevronRight className="inline-block w-4 h-4 text-blue-500 mr-2" />}
          {line.type === 'output' && <Bot className="inline-block w-4 h-4 text-gray-500 mr-2" />}
          {line.type === 'error' && <ChevronRight className="inline-block w-4 h-4 text-red-500 mr-2" />}
        </div>
        <p className={`whitespace-pre-wrap ${lineClasses[line.type]}`}>{line.content}</p>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg h-full flex flex-col font-mono">
      <div className="p-4 border-b border-gray-700 text-white font-semibold">
        Alpha-Orion CLI
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-2">
        {lines.map(renderLine)}
        {isProcessing && (
          <div className="flex items-center text-sm text-yellow-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2"></div>
            Processing...
          </div>
        )}
        <div ref={endOfLinesRef} />
      </div>
      <div className="p-2 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-center">
          <span className="text-blue-400 font-bold mr-2">alpha-orion&gt;</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent text-gray-300 focus:outline-none"
            placeholder="Type a command..."
            disabled={isProcessing}
            autoFocus
          />
          <button type="submit" className="ml-2 text-gray-500 hover:text-white">
            <CornerDownLeft className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Terminal;
