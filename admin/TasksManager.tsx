import React, { useEffect, useState } from 'react';
import { provider } from '../core/provider';
import { Task, ClassInfo, Student, TaskReply } from '../types';
import { Icon } from '../components/Icons';
import { Modal } from '../components/Modal';

export const TasksManager: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all'); // Changed default to 'all'
  const [filterGrade, setFilterGrade] = useState<string>('all'); // New Grade Filter

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task>>({});
  
  // View Reply State
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [taskReplies, setTaskReplies] = useState<TaskReply[]>([]);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);

  useEffect(() => {
    const loadInit = async () => {
        const cList = await provider.classes.list();
        setClasses(cList);
        loadTasks(); // Load all initially
    };
    loadInit();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [selectedClassId, filterGrade]);

  const loadTasks = async () => {
    // In a real app, we would pass filters to the API. 
    // Here we get list by class if selected, or all if 'all', then filter by grade client-side if needed (or assume list returns all)
    // Given the provider signature `list(classId)`, let's assume if we pass 'all' or empty it returns all, 
    // or we fetch all classes and aggregate. 
    // For simplicity with existing provider:
    
    let data: Task[] = [];
    if (selectedClassId === 'all') {
        // Fetch for all known classes or if provider supports 'all'
        // For this mock provider, `tasks.list` filters by classId exactly. 
        // We might need to iterate classes or update provider. 
        // Let's assume provider.tasks.list returns all if we pass nothing or special char, 
        // BUT existing code: return all.filter(t => t.classId === classId).
        // Let's iterate classes to mimic "All".
        const allTasks = await provider.tasks.list(''); // Assuming empty string returns nothing or needs tweak.
        // Actually mockProvider filters: `return all.filter(t => t.classId === classId)`
        // We'll just fetch raw if possible or iterate.
        // Workaround: Fetch for all classes
        for (const c of classes) {
            const t = await provider.tasks.list(c.id);
            data = [...data, ...t];
        }
        // Also fetch 'all' global tasks
        const globalTasks = await provider.tasks.list('all');
        data = [...data, ...globalTasks];
        
        // Remove duplicates by ID
        data = Array.from(new Map(data.map(item => [item.id, item])).values());
    } else {
        data = await provider.tasks.list(selectedClassId);
    }

    // Filter by Grade
    if (filterGrade !== 'all') {
        data = data.filter(t => t.grade === filterGrade);
    }

    setTasks(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask.id) {
        await provider.tasks.update(editingTask.id, editingTask);
    } else {
        await provider.tasks.add({
            ...editingTask,
            createdAt: new Date().toISOString()
        } as Omit<Task, 'id'>);
    }
    setIsModalOpen(false);
    loadTasks();
  };

  const handleDelete = async (id: string) => {
      if(window.confirm('Xóa bài tập này?')) {
          await provider.tasks.remove(id);
          loadTasks();
      }
  };

  const openEditModal = (task?: Task) => {
      setEditingTask(task || {
          title: '',
          description: '',
          classId: selectedClassId === 'all' ? classes[0]?.id || 'all' : selectedClassId,
          dueDate: new Date().toISOString().split('T')[0],
          requireReply: true,
          grade: filterGrade !== 'all' ? filterGrade : '1',
          unit: 'Unit 1'
      });
      setIsModalOpen(true);
  };

  const openRepliesModal = async (task: Task) => {
      setViewingTask(task);
      const [replies, students] = await Promise.all([
          provider.tasks.getReplies(task.id),
          provider.students.list()
      ]);
      setTaskReplies(replies);
      
      // If task is global ('all'), show all students? Or just those who replied?
      // Better to show ClassStudents if class is specific.
      if (task.classId === 'all') {
         setClassStudents(students); // Show all students in system
      } else {
         setClassStudents(students.filter(s => s.classId === task.classId));
      }
      setIsReplyModalOpen(true);
  };

  const getUnits = (grade?: string) => {
      const g = grade || '1';
      const maxUnits = (g === '1' || g === '2') ? 16 : 20;
      return Array.from({ length: maxUnits }, (_, i) => `Unit ${i + 1}`);
  };

  // Helper to parse attachments
  const parseAttachments = (json?: string) => {
      if (!json) return [];
      try {
          const parsed = JSON.parse(json);
          if (Array.isArray(parsed)) {
              return parsed.map(item => {
                  if (typeof item === 'string') return { type: 'link', url: item, name: 'Link' };
                  return item;
              });
          }
          return [];
      } catch { return []; }
  };

  const formatDateDisplay = (isoDate: string) => {
      if (!isoDate) return '';
      const parts = isoDate.split('T')[0].split('-');
      if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return isoDate;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
            <h2 className="text-xl font-bold text-gray-800">Quản lý Bài tập / Nhắc việc</h2>
            <div className="mt-2 flex space-x-2">
                <select 
                    className="px-3 py-1 border rounded-lg text-sm bg-gray-50"
                    value={filterGrade}
                    onChange={e => setFilterGrade(e.target.value)}
                >
                    <option value="all">Tất cả Khối</option>
                    {[1,2,3,4,5].map(g => <option key={g} value={String(g)}>Khối {g}</option>)}
                </select>

                <select 
                    className="px-3 py-1 border rounded-lg text-sm bg-gray-50"
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                >
                    <option value="all">Tất cả Lớp</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                </select>
            </div>
        </div>
        <button 
          onClick={() => openEditModal()}
          className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          <Icon name="plus" size={18} className="mr-2" /> Tạo bài tập
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-sm sticky top-0">
            <tr>
              <th className="px-6 py-4">Bài tập</th>
              <th className="px-6 py-4">Vị trí</th>
              <th className="px-6 py-4">Phạm vi</th>
              <th className="px-6 py-4">Hạn nộp</th>
              <th className="px-6 py-4 text-center">Yêu cầu nộp</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tasks.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="text-xs text-gray-500 truncate max-w-xs">{item.description}</div>
                </td>
                <td className="px-6 py-4 text-gray-600">
                    {item.grade ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                            Khối {item.grade} &gt; {item.unit}
                        </span>
                    ) : <span className="text-gray-400 text-xs">-</span>}
                </td>
                 <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                        {item.classId === 'all' ? 'Toàn trường' : classes.find(c => c.id === item.classId)?.className}
                    </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatDateDisplay(item.dueDate)}</td>
                <td className="px-6 py-4 text-center">
                    {item.requireReply ? (
                        <button onClick={() => openRepliesModal(item)} className="text-blue-600 hover:underline text-sm font-bold">
                            Xem phản hồi
                        </button>
                    ) : (
                        <span className="text-gray-400 text-sm">Không</span>
                    )}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-800 font-medium text-sm">Sửa</button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 font-medium text-sm">Xóa</button>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
                <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">Chưa có bài tập nào.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask.id ? 'Sửa bài tập' : 'Tạo bài tập mới'}
      >
        <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
                <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    value={editingTask.title}
                    onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Khối (Grade)</label>
                    <select
                        className="w-full px-3 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                        value={editingTask.grade}
                        onChange={e => setEditingTask({...editingTask, grade: e.target.value, unit: 'Unit 1'})}
                    >
                        {[1,2,3,4,5].map(g => <option key={g} value={String(g)}>Khối {g}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bài (Unit)</label>
                    <select
                        className="w-full px-3 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                        value={editingTask.unit}
                        onChange={e => setEditingTask({...editingTask, unit: e.target.value})}
                    >
                        {getUnits(editingTask.grade).map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giao cho Lớp</label>
                    <select
                        className="w-full px-3 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                        value={editingTask.classId}
                        onChange={e => setEditingTask({...editingTask, classId: e.target.value})}
                    >
                        <option value="all">Toàn trường / Chung</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hạn nộp</label>
                    <input
                        type="date"
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                        value={editingTask.dueDate?.split('T')[0]}
                        onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})}
                    />
                </div>
            </div>
            
            <div className="flex items-center">
                <input 
                    type="checkbox"
                    id="reqReply"
                    checked={editingTask.requireReply}
                    onChange={e => setEditingTask({...editingTask, requireReply: e.target.checked})}
                    className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="reqReply" className="ml-2 text-sm text-gray-700">Yêu cầu nộp bài / phản hồi</label>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả chi tiết</label>
                <textarea
                    required
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    value={editingTask.description}
                    onChange={e => setEditingTask({...editingTask, description: e.target.value})}
                />
            </div>
            <div className="flex justify-end pt-4">
                <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mr-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    Hủy
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                    Lưu
                </button>
            </div>
        </form>
      </Modal>

      {/* Reply Monitor Modal */}
      <Modal
         isOpen={isReplyModalOpen}
         onClose={() => setIsReplyModalOpen(false)}
         title={`Theo dõi nộp bài: ${viewingTask?.title}`}
      >
          <div className="max-h-[60vh] overflow-y-auto">
              <div className="mb-4 text-sm text-gray-500">
                  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                    <span>Tổng số học sinh: <strong>{classStudents.length}</strong></span>
                    <span>Đã nộp: <strong className="text-green-600">{taskReplies.length}</strong></span>
                    <span>Chưa nộp: <strong className="text-red-600">{classStudents.length - taskReplies.length}</strong></span>
                  </div>
              </div>
              <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 text-gray-600">
                      <tr>
                          <th className="px-3 py-2">Học sinh</th>
                          <th className="px-3 py-2">Trạng thái</th>
                          <th className="px-3 py-2">Nội dung</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {classStudents.map(s => {
                          const reply = taskReplies.find(r => r.studentId === s.id);
                          const items = parseAttachments(reply?.attachmentsJson);
                          
                          return (
                              <tr key={s.id}>
                                  <td className="px-3 py-3 font-medium">{s.fullName}</td>
                                  <td className="px-3 py-3">
                                      {reply ? (
                                          <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">Đã nộp</span>
                                      ) : (
                                          <span className="text-red-600 text-xs bg-red-50 px-2 py-1 rounded">Chưa nộp</span>
                                      )}
                                  </td>
                                  <td className="px-3 py-3 max-w-[200px]">
                                      {reply ? (
                                          <div>
                                              <p className="text-gray-800 break-words">{reply.replyText}</p>
                                              {items.length > 0 && (
                                                  <div className="mt-1 space-y-1">
                                                      {items.map((item: any, idx: number) => (
                                                          <a 
                                                            key={idx} 
                                                            href={item.url} 
                                                            target="_blank" 
                                                            rel="noreferrer" 
                                                            download={item.type === 'file' ? item.name : undefined}
                                                            className="flex items-center text-blue-500 hover:underline text-xs"
                                                          >
                                                              <Icon name={item.type === 'file' ? 'file' : 'link'} size={12} className="mr-1" /> 
                                                              {item.name}
                                                          </a>
                                                      ))}
                                                  </div>
                                              )}
                                              <div className="text-xs text-gray-400 mt-1">{new Date(reply.submittedAt).toLocaleDateString()}</div>
                                          </div>
                                      ) : <span className="text-gray-400">-</span>}
                                  </td>
                              </tr>
                          )
                      })}
                  </tbody>
              </table>
          </div>
      </Modal>
    </div>
  );
};