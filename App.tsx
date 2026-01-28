import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { provider } from './core/provider';
import { User } from './types';
import Layout from './components/Layout';
import { AdminDashboard } from './admin/AdminDashboard';
import { StudentsManager } from './admin/StudentsManager';
import { ClassesManager } from './admin/ClassesManager';
import { ParentsManager } from './admin/ParentsManager';
import { AttendanceManager } from './admin/AttendanceManager';
import { BehaviorManager } from './admin/BehaviorManager';
import { AnnouncementsManager } from './admin/AnnouncementsManager';
import { DocumentsManager } from './admin/DocumentsManager';
import { TasksManager } from './admin/TasksManager';
import { MessagesManager } from './admin/MessagesManager';
import { ReportsDashboard } from './admin/ReportsDashboard';
import { QuestionBankManager } from './admin/QuestionBankManager'; 
import { AppDashboard } from './app/AppDashboard';
import { AttendanceHistory } from './app/AttendanceHistory';
import { BehaviorHistory } from './app/BehaviorHistory';
import { AnnouncementsFeed } from './app/AnnouncementsFeed';
import { DocumentsLibrary } from './app/DocumentsLibrary';
import { TasksList } from './app/TasksList';
import { MessagesApp } from './app/MessagesApp';
import { LevelGame } from './app/LevelGame'; 
import { HonorBoard } from './app/HonorBoard';
import { AIAssistant } from './app/AIAssistant';
import { LanguageProvider, useLanguage } from './core/i18n';

// Auth Page Component
const AuthPage = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<'admin' | 'student' | 'parent'>('student');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { t, toggleLanguage, language } = useLanguage();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegister) {
                await provider.auth.register({ username, password, fullName, role });
                alert(t('auth.success'));
                setIsRegister(false);
            } else {
                const user = await provider.auth.login(username, password);
                if (user) {
                    // Simple auth state management via localStorage for demo
                    localStorage.setItem('mrs_hien_user', JSON.stringify(user));
                    navigate(user.role === 'admin' ? '/admin' : '/app');
                } else {
                    setError('Tên đăng nhập hoặc mật khẩu không đúng.'); // Keep error msg simple or translate later
                }
            }
        } catch (err: any) {
            setError(err.message || t('auth.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative">
             <div className="absolute top-4 right-4">
                 <button 
                    onClick={toggleLanguage}
                    className="flex items-center justify-center px-3 py-1 bg-white rounded shadow text-sm font-bold text-gray-600 hover:text-emerald-600"
                 >
                     {language === 'vi' ? '🇻🇳 VN' : '🇬🇧 EN'}
                 </button>
             </div>
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-emerald-600 p-8 text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">Hệ sinh thái số SmartClass</h1>
                    <p className="text-emerald-100">Learning Management System</p>
                </div>
                <div className="p-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
                        {isRegister ? t('auth.register') : t('auth.login')}
                    </h2>
                    
                    {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegister && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.fullname')}</label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.role')}</label>
                                    <select 
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                                        value={role}
                                        onChange={e => setRole(e.target.value as any)}
                                    >
                                        <option value="student">{t('auth.role.student')}</option>
                                        <option value="parent">{t('auth.role.parent')}</option>
                                        <option value="admin">{t('auth.role.admin')}</option>
                                    </select>
                                </div>
                            </>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.username')}</label>
                            <input 
                                type="text" 
                                required 
                                className="w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')}</label>
                            <input 
                                type="password" 
                                required 
                                className="w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                        >
                            {loading ? t('auth.processing') : (isRegister ? t('auth.register_submit') : t('auth.submit'))}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        {isRegister ? (
                            <p className="text-gray-600">
                                {t('auth.have_account')}{' '}
                                <button onClick={() => setIsRegister(false)} className="text-emerald-600 font-bold hover:underline">
                                    {t('auth.login_now')}
                                </button>
                            </p>
                        ) : (
                            <p className="text-gray-600">
                                {t('auth.no_account')}{' '}
                                <button onClick={() => setIsRegister(true)} className="text-emerald-600 font-bold hover:underline">
                                    {t('auth.register_now')}
                                </button>
                            </p>
                        )}
                    </div>
                </div>
                <div className="bg-gray-50 p-4 text-center text-xs text-gray-400">
                    Lần đầu sử dụng? Vui lòng chọn <strong>Đăng ký</strong> để tạo tài khoản Admin/Học sinh. Hệ thống sẽ tự động tạo dữ liệu.
                </div>
            </div>
        </div>
    );
};

// Admin Routes Wrapper
const AdminRoutes = () => {
  return (
    <Layout role="admin">
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/announcements" element={<AnnouncementsManager />} />
        <Route path="/classes" element={<ClassesManager />} />
        <Route path="/students" element={<StudentsManager />} />
        <Route path="/parents" element={<ParentsManager />} />
        <Route path="/attendance" element={<AttendanceManager />} />
        <Route path="/behavior" element={<BehaviorManager />} />
        <Route path="/documents" element={<DocumentsManager />} />
        <Route path="/tasks" element={<TasksManager />} />
        <Route path="/messages" element={<MessagesManager />} />
        <Route path="/reports" element={<ReportsDashboard />} />
        <Route path="/questions" element={<QuestionBankManager />} />
        <Route path="/honor" element={<HonorBoard />} />
      </Routes>
    </Layout>
  );
};

// App (Student/Parent) Routes Wrapper
const AppRoutes = () => {
  return (
    <Layout role="app">
      <Routes>
        <Route path="/" element={<AppDashboard />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/announcements" element={<AnnouncementsFeed />} />
        <Route path="/attendance" element={<AttendanceHistory />} />
        <Route path="/behavior" element={<BehaviorHistory />} />
        <Route path="/tasks" element={<TasksList />} />
        <Route path="/documents" element={<DocumentsLibrary />} />
        <Route path="/reports" element={<div className="p-8">Báo cáo chi tiết (Coming Soon)</div>} />
        <Route path="/messages" element={<MessagesApp />} />
        <Route path="/game" element={<LevelGame />} />
        <Route path="/honor" element={<HonorBoard />} />
      </Routes>
    </Layout>
  );
};

export default function App() {
  // Initialize seed data on mount
  useEffect(() => {
    provider.seedData();
  }, []);

  return (
    <LanguageProvider>
        <HashRouter>
        <Routes>
            <Route path="/" element={<AuthPage />} />
            <Route path="/admin/*" element={<AdminRoutes />} />
            <Route path="/app/*" element={<AppRoutes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </HashRouter>
    </LanguageProvider>
  );
}