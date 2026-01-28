import React, { useEffect, useState, useRef } from 'react';
import { provider } from '../core/provider';
import { MessageThread, Message, ClassInfo } from '../types';
import { Icon } from '../components/Icons';

export const MessagesManager: React.FC = () => {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  
  const [activeThread, setActiveThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitData();
  }, []);

  const loadInitData = async () => {
    const cList = await provider.classes.list();
    setClasses(cList);
    loadThreads();
  };

  const loadThreads = async () => {
    const data = await provider.messages.listThreads(selectedClass === 'all' ? undefined : selectedClass);
    setThreads(data);
  };

  useEffect(() => {
    loadThreads();
  }, [selectedClass]);

  useEffect(() => {
    if (activeThread) {
        loadMessages(activeThread.id);
        const interval = setInterval(() => loadMessages(activeThread.id), 5000); // Poll for new messages
        return () => clearInterval(interval);
    }
  }, [activeThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (threadId: string) => {
      const msgs = await provider.messages.getMessages(threadId);
      setMessages(msgs);
  };

  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim() || !activeThread) return;

      await provider.messages.send(activeThread.id, 'teacher', newMessage);
      setNewMessage('');
      loadMessages(activeThread.id);
      loadThreads(); // Update last message time in sidebar
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Sidebar List */}
      <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50">
        <div className="p-4 border-b border-gray-100 bg-white">
            <h2 className="font-bold text-gray-800 mb-2">Tin nhắn</h2>
            <select 
                className="w-full px-3 py-2 border rounded-lg text-sm"
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
            >
                <option value="all">Tất cả lớp học</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
            </select>
        </div>
        <div className="flex-1 overflow-y-auto">
            {threads.map(t => (
                <div 
                    key={t.id}
                    onClick={() => setActiveThread(t)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-emerald-50 transition ${activeThread?.id === t.id ? 'bg-emerald-50 border-l-4 border-l-emerald-600' : ''}`}
                >
                    <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-gray-800 text-sm">{t.studentName}</span>
                        {t.unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{t.unreadCount}</span>}
                    </div>
                    <div className="text-xs text-gray-400">
                        {new Date(t.lastMessageAt).toLocaleString()}
                    </div>
                </div>
            ))}
            {threads.length === 0 && <div className="p-4 text-center text-gray-400 text-sm">Chưa có tin nhắn nào.</div>}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
          {activeThread ? (
              <>
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                            {activeThread.studentName.charAt(0)}
                        </div>
                        <div>
                            <div className="font-bold text-gray-800">{activeThread.studentName}</div>
                            <div className="text-xs text-gray-500">Phụ huynh/Học sinh</div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {messages.map(m => {
                        const isMe = m.senderRole === 'teacher';
                        return (
                            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] rounded-xl p-3 shadow-sm ${isMe ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}>
                                    <div className="text-sm">{m.content}</div>
                                    <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-emerald-200' : 'text-gray-400'}`}>
                                        {new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-gray-100">
                    <form onSubmit={handleSend} className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 border rounded-lg px-4 py-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            placeholder="Nhập tin nhắn..."
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                        />
                        <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition">
                            <Icon name="send" />
                        </button>
                    </form>
                </div>
              </>
          ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 flex-col">
                  <Icon name="message" size={48} className="mb-4 opacity-20" />
                  <p>Chọn một cuộc hội thoại để bắt đầu</p>
              </div>
          )}
      </div>
    </div>
  );
};