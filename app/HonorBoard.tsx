import React, { useEffect, useState } from 'react';
import { provider } from '../core/provider';
import { Student, ClassInfo } from '../types';
import { Icon } from '../components/Icons';

export const HonorBoard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [perfectAttendance, setPerfectAttendance] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'points' | 'attendance'>('points');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [sList, cList] = await Promise.all([
        provider.students.list(),
        provider.classes.list()
    ]);
    setStudents(sList);
    setClasses(cList);

    // Calculate Perfect Attendance for current month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const perfect: Student[] = [];

    // Note: In a real app with backend, this would be an API call. 
    // Here we iterate, which is fine for small scale.
    for (const s of sList) {
        const records = await provider.listAttendanceByStudent(s.id);
        const monthRecords = records.filter(r => r.date.startsWith(currentMonth));
        
        // Conditions: Has records AND no Absences/Lates
        if (monthRecords.length > 0) {
            const hasIssues = monthRecords.some(r => r.status === 'ABSENT' || r.status === 'LATE');
            if (!hasIssues) {
                perfect.push(s);
            }
        }
    }
    setPerfectAttendance(perfect);
    setLoading(false);
  };

  const topStudents = [...students].sort((a, b) => b.points - a.points).slice(0, 10);
  const top3 = topStudents.slice(0, 3);
  const restTop = topStudents.slice(3);

  const getClassName = (id: string) => classes.find(c => c.id === id)?.className || '';

  if (loading) return <div className="p-10 text-center text-gray-500">Đang cập nhật bảng vàng...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
        {/* Banner */}
        <div className="relative bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-8 text-white shadow-lg overflow-hidden text-center">
            <div className="relative z-10">
                <Icon name="crown" size={48} className="mx-auto mb-2 text-yellow-200" />
                <h1 className="text-3xl font-extrabold uppercase tracking-widest">Bảng Vàng Vinh Danh</h1>
                <p className="opacity-90 mt-2 font-medium">Chúc mừng các ngôi sao sáng nhất tháng này!</p>
            </div>
            {/* Simple CSS decoration circles */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-x-10 -translate-y-10"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full translate-x-10 translate-y-10"></div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-4">
            <button
                onClick={() => setActiveTab('points')}
                className={`px-6 py-2 rounded-full font-bold transition flex items-center ${
                    activeTab === 'points' 
                    ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400' 
                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
            >
                <Icon name="trophy" className="mr-2" /> Top Điểm Tích Lũy
            </button>
            <button
                onClick={() => setActiveTab('attendance')}
                className={`px-6 py-2 rounded-full font-bold transition flex items-center ${
                    activeTab === 'attendance' 
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-400' 
                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
            >
                <Icon name="check" className="mr-2" /> Kiện Tướng Chuyên Cần
            </button>
        </div>

        {/* CONTENT: TOP POINTS */}
        {activeTab === 'points' && (
            <div className="space-y-8">
                {/* Podium for Top 3 */}
                <div className="flex flex-col md:flex-row justify-center items-end gap-4 md:gap-8 pb-4">
                    {/* Rank 2 */}
                    {top3[1] && (
                        <div className="flex flex-col items-center order-2 md:order-1">
                            <div className="mb-2 text-center">
                                <div className="font-bold text-gray-700">{top3[1].fullName}</div>
                                <div className="text-xs text-gray-500">{getClassName(top3[1].classId)}</div>
                                <div className="text-orange-500 font-bold">{top3[1].points} pts</div>
                            </div>
                            <div className="w-24 md:w-32 h-32 md:h-40 bg-gray-200 rounded-t-xl border-t-4 border-gray-400 flex items-center justify-center shadow-md relative">
                                <div className="text-4xl font-bold text-gray-400 opacity-50">2</div>
                                <div className="absolute -top-3 w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-gray-600 font-bold shadow-sm">2</div>
                            </div>
                        </div>
                    )}

                    {/* Rank 1 */}
                    {top3[0] && (
                        <div className="flex flex-col items-center order-1 md:order-2 z-10">
                            <div className="mb-2 text-center">
                                <Icon name="crown" className="mx-auto text-yellow-500 mb-1" />
                                <div className="font-bold text-gray-800 text-lg">{top3[0].fullName}</div>
                                <div className="text-xs text-gray-500">{getClassName(top3[0].classId)}</div>
                                <div className="text-yellow-600 font-extrabold text-xl">{top3[0].points} pts</div>
                            </div>
                            <div className="w-28 md:w-40 h-40 md:h-52 bg-yellow-100 rounded-t-xl border-t-4 border-yellow-400 flex items-center justify-center shadow-lg relative">
                                <div className="text-6xl font-bold text-yellow-300 opacity-50">1</div>
                                <div className="absolute -top-4 w-10 h-10 rounded-full bg-yellow-400 border-2 border-white flex items-center justify-center text-white font-bold shadow-sm">1</div>
                            </div>
                        </div>
                    )}

                    {/* Rank 3 */}
                    {top3[2] && (
                        <div className="flex flex-col items-center order-3">
                             <div className="mb-2 text-center">
                                <div className="font-bold text-gray-700">{top3[2].fullName}</div>
                                <div className="text-xs text-gray-500">{getClassName(top3[2].classId)}</div>
                                <div className="text-orange-700 font-bold">{top3[2].points} pts</div>
                            </div>
                            <div className="w-24 md:w-32 h-24 md:h-32 bg-orange-100 rounded-t-xl border-t-4 border-orange-400 flex items-center justify-center shadow-md relative">
                                <div className="text-4xl font-bold text-orange-300 opacity-50">3</div>
                                <div className="absolute -top-3 w-8 h-8 rounded-full bg-orange-300 border-2 border-white flex items-center justify-center text-white font-bold shadow-sm">3</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* List for the rest */}
                {restTop.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-2xl mx-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-3 w-16 text-center">Hạng</th>
                                    <th className="px-6 py-3">Họ và tên</th>
                                    <th className="px-6 py-3">Lớp</th>
                                    <th className="px-6 py-3 text-right">Điểm</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {restTop.map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 text-center font-bold text-gray-500">{idx + 4}</td>
                                        <td className="px-6 py-3 font-medium text-gray-800">{s.fullName}</td>
                                        <td className="px-6 py-3 text-gray-500 text-sm">{getClassName(s.classId)}</td>
                                        <td className="px-6 py-3 text-right font-bold text-emerald-600">{s.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}

        {/* CONTENT: ATTENDANCE */}
        {activeTab === 'attendance' && (
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                 <div className="text-center mb-8">
                     <h2 className="text-2xl font-bold text-blue-800">Kiện tướng Chuyên cần Tháng {new Date().getMonth() + 1}</h2>
                     <p className="text-gray-500">Tuyên dương các bạn đi học đầy đủ, đúng giờ!</p>
                 </div>

                 {perfectAttendance.length === 0 ? (
                     <div className="text-center text-gray-400 italic py-10">Chưa có dữ liệu thống kê tháng này.</div>
                 ) : (
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         {perfectAttendance.map(s => (
                             <div key={s.id} className="flex items-center p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                 <div className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center mr-3 font-bold border border-blue-200">
                                     <Icon name="check" size={16} />
                                 </div>
                                 <div>
                                     <div className="font-bold text-gray-800 text-sm">{s.fullName}</div>
                                     <div className="text-xs text-gray-500">{getClassName(s.classId)}</div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
             </div>
        )}
    </div>
  );
};