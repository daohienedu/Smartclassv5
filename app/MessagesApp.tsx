import React, { useEffect, useState, useRef } from 'react';
import { provider } from '../core/provider';
import { MessageThread, Message, Student, User } from '../types';
import { Icon } from '../components/Icons';

export const MessagesApp: React.FC = () => {
  const [thread, setThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
        const userJson = localStorage.getItem('mrs_hien_user');
        if (!userJson) {
            setLoading(false);
            return;
        }
        const user = JSON.parse(userJson) as User;
        let currentStudent: Student | null = null;

        if (user.role === 'student' && user.relatedId) {
            try {
                currentStudent = await provider.students.get(user.relatedId);
            } catch(e) {}
        }
        if (!currentStudent) {
            const all = await provider.students.list();
            currentStudent = all.find(s => s.fullName === user.fullName) || null;
        }

        if (currentStudent) {
            const t = await provider.messages.getThreadByStudent(currentStudent.id);
            setThread(t);
            loadMessages(t.id);
            
            // Poll for messages
            const interval = setInterval(() => loadMessages(t.id), 5000);
            return () => clearInterval(interval);
        }
        setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (threadId: string) => {
      const msgs = await provider.messages.getMessages(threadId);
      setMessages(msgs);
      setLoading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim() || !thread) return;

      await provider.messages.send(thread.id, 'student', newMessage); // Assuming student/parent role grouped
      setNewMessage('');
      loadMessages(thread.id);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Đang kết nối...</div>;

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-emerald-600 text-white flex items-center">
            <div className="w-10 h-10 rounded-full bg-white text-emerald-600 flex items-center justify-center font-bold mr-3 border-2 border-emerald-400">
                MH
            </div>
            <div>
                <div className="font-bold">Mrs. Hien</div>
                <div className="text-xs text-emerald-100">Giáo viên chủ nhiệm</div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.length === 0 && (
                <div className="text-center text-gray-400 py-10 text-sm">
                    Hãy bắt đầu cuộc trò chuyện với cô giáo.
                </div>
            )}
            {messages.map(m => {
                const isMe = m.senderRole !== 'teacher';
                return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-xl p-3 shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}>
                            <div className="text-sm">{m.content}</div>
                            <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
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
                    className="flex-1 border rounded-lg px-4 py-3 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="Nhập tin nhắn..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                />
                <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition font-bold">
                    <Icon name="send" />
                </button>
            </form>
        </div>
    </div>
  );
};