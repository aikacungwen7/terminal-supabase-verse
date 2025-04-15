
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Command = {
  id: string;
  command: string;
  output: string | null;
  executed_at: string | null;
  success: boolean | null;
};

const Terminal = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Command[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [nodeMode, setNodeMode] = useState(false);
  const [nodeCode, setNodeCode] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Built-in commands
  const commands = {
    help: () => 
      `Available commands:
      help - Show this help message
      clear - Clear the terminal
      echo [text] - Print text
      history - Show command history
      whoami - Show current user
      logout - Logout from the system
      custom - List custom commands
      create-command [name] "[description]" "[script]" - Create a custom command
      node - Enter Node.js mode (run JavaScript code)
      exit - Exit from Node.js mode`,
    clear: () => {
      setHistory([]);
      return '';
    },
    echo: (args: string[]) => args.join(' '),
    history: async () => {
      try {
        const { data, error } = await supabase
          .from('command_history')
          .select('command, executed_at')
          .order('executed_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        
        return data.map((cmd, i) => 
          `${i + 1}: ${cmd.command} (${new Date(cmd.executed_at || '').toLocaleString()})`
        ).join('\n');
      } catch (error: any) {
        return `Error: ${error.message}`;
      }
    },
    whoami: () => {
      return user?.email || 'Not logged in';
    },
    logout: async () => {
      await supabase.auth.signOut();
      navigate('/auth');
      return 'Logging out...';
    },
    custom: async () => {
      try {
        const { data, error } = await supabase
          .from('custom_commands')
          .select('name, description')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data.length === 0) {
          return 'No custom commands found. Create one with create-command.';
        }
        
        return data.map(cmd => 
          `${cmd.name}${cmd.description ? ` - ${cmd.description}` : ''}`
        ).join('\n');
      } catch (error: any) {
        return `Error: ${error.message}`;
      }
    },
    'create-command': async (args: string[]) => {
      if (args.length < 3) {
        return 'Usage: create-command [name] "[description]" "[script]"';
      }
      
      const name = args[0];
      const description = args[1];
      const script = args.slice(2).join(' ');
      
      try {
        const { error } = await supabase
          .from('custom_commands')
          .insert([{ name, description, script, user_id: user?.id }]);

        if (error) throw error;
        
        return `Command "${name}" created successfully.`;
      } catch (error: any) {
        return `Error creating command: ${error.message}`;
      }
    },
    node: () => {
      setNodeMode(true);
      setNodeCode('');
      return `Node.js mode entered. Type your JavaScript code, then type 'run' to execute or 'exit' to quit.
Example: 
console.log("Hello World");
const sum = (a, b) => a + b;
sum(5, 3)`;
    },
    exit: () => {
      if (nodeMode) {
        setNodeMode(false);
        return 'Exited Node.js mode.';
      }
      return 'Not in a special mode to exit from.';
    },
    run: async () => {
      if (!nodeMode || !nodeCode.trim()) {
        return 'No code to run or not in Node.js mode.';
      }
      
      try {
        const response = await fetch('/api/run-node', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: nodeCode }),
        });
        
        const data = await response.json();
        
        if (data.error) {
          return `Error: ${data.error}\n${data.output || ''}`;
        }
        
        let result = data.output || '';
        if (data.result !== undefined) {
          if (result) result += '\n';
          result += `=> ${data.result}`;
        }
        
        return result || 'Code executed with no output.';
      } catch (error: any) {
        return `Failed to execute: ${error.message}`;
      }
    }
  };

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
      
      if (!data.session) {
        navigate('/auth');
      } else {
        // Load command history
        loadHistory();
      }
    };
    
    checkUser();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
        if (!session) {
          navigate('/auth');
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);
  
  // Load command history from Supabase
  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('command_history')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      setHistory(data.reverse() || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to load history: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Execute a command
  const executeCommand = async (cmdString: string) => {
    if (!cmdString.trim()) return;
    
    // Special handling for Node.js mode
    if (nodeMode && cmdString !== 'run' && cmdString !== 'exit') {
      // Add the line to the Node.js code buffer
      setNodeCode(prev => prev + (prev ? '\n' : '') + cmdString);
      
      // Add command to history without saving to database
      const newCommand = {
        id: crypto.randomUUID(),
        command: cmdString,
        output: null,
        executed_at: new Date().toISOString(),
        success: true
      };
      
      setHistory(prev => [...prev, newCommand]);
      setInput('');
      
      // Scroll to bottom
      setTimeout(() => {
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }, 0);
      
      return;
    }
    
    setLoading(true);
    
    // Parse command and arguments
    const [cmd, ...args] = cmdString.split(' ');
    let output = '';
    let success = true;
    
    try {
      // Check if it's a built-in command
      if (cmd in commands) {
        // @ts-ignore
        output = await commands[cmd](args);
      } else {
        // Check if it's a custom command
        const { data, error } = await supabase
          .from('custom_commands')
          .select('script')
          .eq('name', cmd)
          .single();
        
        if (error) {
          output = `Command not found: ${cmd}. Type 'help' for available commands.`;
          success = false;
        } else {
          // Execute custom command
          try {
            // Here we'd typically execute the script - for safety we just return it
            output = `Custom command script: ${data.script}\nArguments: ${args.join(' ')}`;
          } catch (e: any) {
            output = `Error executing custom command: ${e.message}`;
            success = false;
          }
        }
      }
      
      // Save command to history
      if (cmd !== 'clear') {
        const newCommand = {
          id: crypto.randomUUID(),
          command: cmdString,
          output,
          executed_at: new Date().toISOString(),
          success
        };
        
        setHistory(prev => [...prev, newCommand]);
        
        // Save to Supabase
        await supabase
          .from('command_history')
          .insert([{
            command: cmdString,
            output,
            success,
            user_id: user?.id
          }]);
      }
    } catch (error: any) {
      output = `Error: ${error.message}`;
      success = false;
    } finally {
      setLoading(false);
      setInput('');
      setHistoryIndex(-1);
      
      // Scroll to bottom
      setTimeout(() => {
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }, 0);
    }
  };

  // Handle key events for command history navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Navigate up through command history
      const commandHistory = history
        .filter(item => item.command)
        .map(item => item.command);
      
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 
          ? historyIndex + 1 
          : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Navigate down through command history
      const commandHistory = history
        .filter(item => item.command)
        .map(item => item.command);
      
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple command completion
      const builtInCommands = Object.keys(commands);
      const cmdStart = input.split(' ')[0];
      
      if (cmdStart) {
        const matches = builtInCommands.filter(cmd => 
          cmd.startsWith(cmdStart) && cmd !== cmdStart
        );
        
        if (matches.length === 1) {
          setInput(matches[0] + ' ');
        }
      }
    }
  };

  // Focus input when clicking on terminal
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div 
      className="w-full h-screen bg-black text-green-400 font-mono p-4 overflow-hidden flex flex-col"
      onClick={focusInput}
    >
      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto pb-4"
      >
        <div className="mb-4">
          <pre className="text-cyan-400">
{`
 _____                   _             _ 
|_   _|__ _ __ _ __ ___ (_)_ __   __ _| |
  | |/ _ \\ '__| '_ \` _ \\| | '_ \\ / _\` | |
  | |  __/ |  | | | | | | | | | | (_| | |
  |_|\\___|_|  |_| |_| |_|_|_| |_|\\__,_|_|
                                         
Welcome to Terminal Web. Type 'help' for available commands.
`}
          </pre>
          <div className="text-gray-400">
            Connected as: {user?.email || 'Not logged in'}
          </div>
          {nodeMode && (
            <div className="mt-2 p-2 bg-gray-900 border border-green-800 rounded">
              <div className="text-yellow-400 font-bold">Node.js Mode</div>
              <div className="text-gray-400 text-sm">
                Type 'run' to execute, 'exit' to quit
              </div>
            </div>
          )}
        </div>
        
        {/* Command history */}
        {history.map((item, index) => (
          <div key={item.id || index} className="mb-2">
            <div className="flex">
              <span className="text-blue-400 mr-2">$</span>
              <span>{item.command}</span>
            </div>
            {item.output && (
              <div className={`ml-4 whitespace-pre-wrap ${item.success ? 'text-green-400' : 'text-red-400'}`}>
                {item.output}
              </div>
            )}
          </div>
        ))}
        
        {/* Command prompt */}
        <div className="flex items-center">
          <span className="text-blue-400 mr-2">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-green-400"
            autoFocus
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default Terminal;
