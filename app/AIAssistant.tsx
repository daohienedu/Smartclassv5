import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Icon } from '../components/Icons';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am your English Assistant. I can help you practice speaking or check your grammar. What do you want to talk about today?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use a ref to store the chat session so it persists across renders
  const chatSession = useRef<Chat | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getChatSession = () => {
      if (chatSession.current) return chatSession.current;
      try {
          // Initialize Gemini lazily
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          chatSession.current = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: {
               systemInstruction: "You are a friendly and encouraging English tutor for a young student (CEFR Level A1-A2). Your goal is to help them practice English conversation and correct their grammar. If the student makes a mistake, gently correct it first (e.g. 'Did you mean...?'), then continue the conversation. Keep your responses concise, simple, and engaging.",
            }
          });
          return chatSession.current;
      } catch (error) {
          console.error("Failed to initialize AI:", error);
          return null;
      }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    
    const session = getChatSession();

    if (!session) {
        // Fallback or Alert
        alert("AI Service is not configured correctly (Missing API Key or Initialization Failed).");
        return;
    }

    const userMsg = inputText;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputText('');
    setIsLoading(true);

    try {
      const responseStream = await session.sendMessageStream({ message: userMsg });
      
      let fullResponse = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]); // Placeholder

      for await (const chunk of responseStream) {
          const c = chunk as GenerateContentResponse;
          if (c.text) {
              fullResponse += c.text;
              // Update the last message (model's response) progressively
              setMessages(prev => {
                  const newArr = [...prev];
                  newArr[newArr.length - 1] = { role: 'model', text: fullResponse };
                  return newArr;
              });
          }
      }
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center shadow-sm">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3 backdrop-blur-sm">
                <Icon name="bot" size={24} />
            </div>
            <div>
                <div className="font-bold text-lg">English AI Tutor</div>
                <div className="text-xs text-indigo-100 flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                    Online • Gemini Powered
                </div>
            </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
            {messages.map((m, idx) => {
                const isUser = m.role === 'user';
                return (
                    <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        {!isUser && (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-2 mt-1">
                                <Icon name="bot" size={16} />
                            </div>
                        )}
                        <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed ${
                            isUser 
                            ? 'bg-indigo-600 text-white rounded-br-none' 
                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                        }`}>
                            {m.text}
                        </div>
                    </div>
                );
            })}
            {isLoading && (
                 <div className="flex justify-start">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-2 mt-1">
                        <Icon name="bot" size={16} />
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-4 shadow-sm flex space-x-1 items-center h-12">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
            <form onSubmit={handleSend} className="relative">
                <input 
                    type="text" 
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    placeholder="Type your message here..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    disabled={isLoading}
                />
                <button 
                    type="submit" 
                    disabled={!inputText.trim() || isLoading}
                    className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition"
                >
                    <Icon name="send" size={20} />
                </button>
            </form>
            <div className="text-center text-xs text-gray-400 mt-2">
                AI có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng.
            </div>
        </div>
    </div>
  );
};