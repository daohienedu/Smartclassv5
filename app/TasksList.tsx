import React, { useEffect, useState, useRef } from 'react';
import { provider } from '../core/provider';
import { Task, TaskReply, Student, User } from '../types';
import { Icon } from '../components/Icons';
import { Modal } from '../components/Modal';

// Helper to handle mixed attachment types (string URLs or objects)
const parseAttachments = (json: string) => {
    try {
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed)) {
            return parsed.map(item => {
                if (typeof item === 'string') return { type: 'link', url: item, name: item };
                return item;
            });
        }
        return [];
    } catch { return []; }
};

export const TasksList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [replies, setReplies] = useState<TaskReply[]>([]);
  const [loading, setLoading] = useState(true);

  // Folder Navigation State
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  // Reply Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [replyText, setReplyText] = useState('');
  const [links, setLinks] = useState<string[]>(['']);
  const [files, setFiles] = useState<File[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
      setStudent(currentStudent);
      
      // Load ALL tasks initially to populate folders. 
      // In real app we might fetch by folder, but for now we filter locally.
      // We fetch class tasks AND global tasks ('all')
      const classTasks = await provider.tasks.list(currentStudent.classId);
      const globalTasks = await provider.tasks.list('all');
      
      const allTasks = [...classTasks, ...globalTasks];
      // remove duplicates
      const uniqueTasks = Array.from(new Map(allTasks.map(item => [item.id, item])).values());

      // Fetch replies for this student
      const allReplies: TaskReply[] = [];
      for (const task of uniqueTasks) {
          const taskReplies = await provider.tasks.getReplies(task.id);
          const myReply = taskReplies.find(r => r.studentId === currentStudent?.id);
          if (myReply) allReplies.push(myReply);
      }
      
      setTasks(uniqueTasks);
      setReplies(allReplies);
    }
    setLoading(false);
  };

  const getUnits = (grade: string) => {
      const maxUnits = (grade === '1' || grade === '2') ? 16 : 20;
      return Array.from({ length: maxUnits }, (_, i) => `Unit ${i + 1}`);
  };

  const getStatus = (task: Task) => {
      const reply = replies.find(r => r.taskId === task.id);
      if (reply) return 'submitted';
      
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      if (now > dueDate) return 'overdue';
      
      return 'pending';
  };

  const openReplyModal = (task: Task) => {
      setActiveTask(task);
      setReplyText('');
      setLinks(['']);
      setFiles([]);
      setIsModalOpen(true);
  };

  const handleAddLink = () => setLinks([...links, '']);
  const handleLinkChange = (index: number, val: string) => {
      const newLinks = [...links];
      newLinks[index] = val;
      setLinks(newLinks);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const newFiles = Array.from(e.target.files);
          setFiles([...files, ...newFiles]);
      }
  };

  const removeFile = (index: number) => {
      setFiles(files.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
      });
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeTask || !student) return;

      // Process Links
      const cleanLinks = links
        .filter(l => l.trim() !== '')
        .map(l => ({ type: 'link', url: l, name: l }));
      
      // Process Files
      const processedFiles = await Promise.all(files.map(async (f) => {
          const base64 = await fileToBase64(f);
          return { type: 'file', url: base64, name: f.name };
      }));

      const allAttachments = [...cleanLinks, ...processedFiles];
      
      await provider.tasks.reply({
          taskId: activeTask.id,
          studentId: student.id,
          replyText,
          attachmentsJson: JSON.stringify(allAttachments),
          submittedAt: new Date().toISOString()
      });

      setIsModalOpen(false);
      loadData(); // Refresh to update status
      alert('Nộp bài thành công!');
  };

  // Filter Logic
  // Show tasks that match selected Grade & Unit.
  // If task has no grade/unit, show it in Root level under "General Tasks"
  const filteredTasks = tasks.filter(t => 
      (selectedGrade ? t.grade === selectedGrade : !t.grade) &&
      (selectedUnit ? t.unit === selectedUnit : !t.unit)
  );

  const rootTasks = tasks.filter(t => !t.grade);

  const renderBreadcrumb = () => (
    <div className="flex items-center text-sm text-gray-500 mb-6 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
        <button 
          onClick={() => { setSelectedGrade(null); setSelectedUnit(null); }}
          className={`hover:text-emerald-600 ${!selectedGrade ? 'font-bold text-emerald-700' : ''}`}
        >
            <Icon name="home" size={16} className="inline mr-1" /> Bài tập
        </button>
        
        {selectedGrade && (
            <>
              <Icon name="chevronRight" size={14} className="mx-2" />
              <button 
                  onClick={() => setSelectedUnit(null)}
                  className={`hover:text-emerald-600 ${!selectedUnit ? 'font-bold text-emerald-700' : ''}`}
              >
                  Khối {selectedGrade}
              </button>
            </>
        )}

        {selectedUnit && (
             <>
              <Icon name="chevronRight" size={14} className="mx-2" />
              <span className="font-bold text-emerald-700">{selectedUnit}</span>
             </>
        )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <Icon name="book" className="mr-3 text-emerald-600" />
                Bài tập & Nhắc việc
            </h2>
        </div>

        {renderBreadcrumb()}

        {loading ? (
            <div className="text-center py-10 text-gray-500">Đang tải...</div>
        ) : (
            <>
                {/* View 1: Grade Selection */}
                {!selectedGrade && (
                    <div className="space-y-8">
                         <div>
                            <h3 className="text-lg font-bold text-gray-700 mb-4">Chọn Khối Lớp</h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {[1, 2, 3, 4, 5].map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setSelectedGrade(String(g))}
                                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition flex flex-col items-center justify-center group"
                                    >
                                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-3 group-hover:bg-blue-100 group-hover:scale-110 transition">
                                            <Icon name="folder" size={32} />
                                        </div>
                                        <span className="font-bold text-gray-800">Khối {g}</span>
                                        <span className="text-xs text-gray-400 mt-1">
                                            {tasks.filter(t => t.grade === String(g)).length} bài
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {rootTasks.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-700 mb-4">Bài tập chung (Chưa phân loại)</h3>
                                {renderTaskList(rootTasks)}
                            </div>
                        )}
                    </div>
                )}

                {/* View 2: Unit Selection */}
                {selectedGrade && !selectedUnit && (
                     <div>
                        <h3 className="text-lg font-bold text-gray-700 mb-4">Danh sách Bài học - Khối {selectedGrade}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                           {getUnits(selectedGrade).map(unit => {
                                const count = tasks.filter(t => t.grade === selectedGrade && t.unit === unit).length;
                                return (
                                   <button
                                       key={unit}
                                       onClick={() => setSelectedUnit(unit)}
                                       className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition text-left group"
                                   >
                                       <div className="flex items-center justify-between mb-2">
                                           <Icon name="folder" className="text-yellow-500 group-hover:scale-110 transition" size={24} />
                                           <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{count}</span>
                                       </div>
                                       <div className="font-medium text-gray-800">{unit}</div>
                                   </button>
                                );
                           })}
                        </div>
                   </div>
                )}

                {/* View 3: Task List */}
                {selectedGrade && selectedUnit && (
                    <div>
                         <div className="mb-4">
                             <h3 className="text-lg font-bold text-gray-700">{selectedUnit} - Khối {selectedGrade}</h3>
                         </div>
                         {filteredTasks.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
                                <p className="text-gray-500">Không có bài tập nào trong mục này.</p>
                            </div>
                         ) : renderTaskList(filteredTasks)}
                    </div>
                )}
            </>
        )}

        <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={`Nộp bài: ${activeTask?.title}`}
        >
            <form onSubmit={handleSubmitReply} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung phản hồi</label>
                    <textarea 
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                        rows={4}
                        placeholder="Em đã hoàn thành..."
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                    />
                </div>
                
                {/* Link Section */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Liên kết (Google Drive, Youtube...)</label>
                    {links.map((link, idx) => (
                        <input 
                            key={idx}
                            type="url"
                            className="w-full px-3 py-2 border rounded-lg mb-2 text-sm"
                            placeholder="https://..."
                            value={link}
                            onChange={e => handleLinkChange(idx, e.target.value)}
                        />
                    ))}
                    <button type="button" onClick={handleAddLink} className="text-sm text-blue-600 hover:underline flex items-center">
                        <Icon name="plus" size={14} className="mr-1" /> Thêm liên kết
                    </button>
                </div>

                {/* File Attachment Section */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Đính kèm tệp (Ảnh/Word/PDF)</label>
                    <input 
                        type="file"
                        multiple
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition text-sm text-gray-700"
                    >
                        <Icon name="paperclip" size={16} className="mr-2" /> Chọn tệp từ máy
                    </button>

                    {files.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {files.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 text-sm">
                                    <span className="truncate max-w-[200px]">{file.name}</span>
                                    <button 
                                        type="button" 
                                        onClick={() => removeFile(idx)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                    >
                                        <Icon name="trash" size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100 mt-4">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="mr-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold"
                    >
                        Gửi bài
                    </button>
                </div>
            </form>
        </Modal>
    </div>
  );

  function renderTaskList(taskList: Task[]) {
      return (
        <div className="space-y-4">
            {taskList.map(task => {
                const status = getStatus(task);
                const myReply = replies.find(r => r.taskId === task.id);
                const attachments = myReply?.attachmentsJson ? parseAttachments(myReply.attachmentsJson) : [];

                return (
                    <div key={task.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                {status === 'overdue' && (
                                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded flex items-center">
                                        <Icon name="alert" size={12} className="mr-1" /> Quá hạn
                                    </span>
                                )}
                                {status === 'submitted' && (
                                    <span className="bg-green-100 text-green-600 text-xs font-bold px-2 py-1 rounded flex items-center">
                                        <Icon name="check" size={12} className="mr-1" /> Đã nộp
                                    </span>
                                )}
                                {status === 'pending' && task.requireReply && (
                                    <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded flex items-center">
                                        <Icon name="clock" size={12} className="mr-1" /> Cần nộp bài
                                    </span>
                                )}
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    Hạn: {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{task.title}</h3>
                            <p className="text-gray-600 text-sm whitespace-pre-wrap">{task.description}</p>
                            
                            {myReply && (
                                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm border border-gray-100">
                                    <p className="font-bold text-gray-700 mb-1">Bài đã nộp:</p>
                                    <p className="text-gray-600 italic mb-2">"{myReply.replyText}"</p>
                                    
                                    {attachments.length > 0 && (
                                        <div className="flex flex-col gap-1 border-t border-gray-200 pt-2">
                                            {attachments.map((item: any, idx: number) => (
                                                <a 
                                                    key={idx} 
                                                    href={item.url} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    download={item.type === 'file' ? item.name : undefined}
                                                    className="text-blue-500 hover:underline flex items-center text-xs"
                                                >
                                                    <Icon name={item.type === 'file' ? 'file' : 'link'} size={12} className="mr-1" /> 
                                                    {item.name}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end md:w-32">
                            {!myReply && task.requireReply && (
                                <button 
                                    onClick={() => openReplyModal(task)}
                                    className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium flex justify-center items-center"
                                >
                                    <Icon name="send" size={16} className="mr-2" /> Nộp bài
                                </button>
                            )}
                            {!task.requireReply && !myReply && (
                                <span className="text-gray-400 text-sm italic">Chỉ xem</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      );
  }
};