import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, History, Sparkles, Navigation, ShieldCheck, Clock, Calendar, Wifi, CheckCircle2, AlertTriangle, X, Edit2, Save, LogIn, LogOut, Lock } from 'lucide-react';
import { format } from 'date-fns';
import vi from 'date-fns/locale/vi';

import { CameraCapture } from './components/CameraCapture';
import { generateAttendanceReport } from './services/geminiService';
import { AttendanceRecord, AttendanceType, Coordinates, User, ViewState } from './types';

// Mock User Data
const MOCK_USER: User = {
  id: 'NV-2024-001',
  name: 'Nguyễn Văn A',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  department: 'Phòng Kỹ Thuật',
  shiftStart: '08:00',
  shiftEnd: '17:30',
  role: 'EMPLOYEE' // Đổi thành 'ADMIN' để bật tính năng sửa
};

const ZALO_BLUE = "bg-[#0068FF]";

// --- Extracted Components ---

const Header = ({ title }: { title: string }) => (
  <div className={`${ZALO_BLUE} text-white pt-safe pb-4 px-4 shadow-md sticky top-0 z-40`}>
    <div className="flex items-center justify-between pt-2">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="text-xs opacity-90 bg-white/20 px-2 py-1 rounded-full flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> Bảo mật
      </div>
    </div>
  </div>
);

const SuccessOverlay = ({ show, isCheckedIn }: { show: boolean; isCheckedIn: boolean }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 animate-fade-in backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center shadow-2xl max-w-[80%] animate-scale-up">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-12 h-12 text-green-600" strokeWidth={3} />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-1">Thành công!</h3>
        <p className="text-gray-500 text-center text-sm">
          Đã ghi nhận {isCheckedIn ? 'giờ về' : 'giờ vào'} của bạn.
        </p>
        <p className="text-xs text-gray-400 mt-4 font-mono">
          {format(new Date(), 'HH:mm:ss - dd/MM/yyyy')}
        </p>
      </div>
    </div>
  );
};

interface EditModalProps {
  record: AttendanceRecord | null;
  time: string;
  setTime: (t: string) => void;
  type: AttendanceType;
  setType: (t: AttendanceType) => void;
  onClose: () => void;
  onSave: () => void;
}

const EditModal: React.FC<EditModalProps> = ({
  record,
  time,
  setTime,
  type,
  setType,
  onClose,
  onSave
}) => {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 animate-fade-in backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Chỉnh sửa chấm công</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Date Display (Read only) */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Ngày</label>
            <div className="text-gray-800 font-medium">
              {format(record.timestamp, 'dd/MM/yyyy')}
            </div>
          </div>

          {/* Time Input */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Giờ chấm công</label>
            <input 
              type="time" 
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Type Select */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Loại</label>
            <div className="flex gap-2">
              <button
                onClick={() => setType(AttendanceType.CHECK_IN)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${type === AttendanceType.CHECK_IN ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Vào ca (Check-in)
              </button>
              <button
                onClick={() => setType(AttendanceType.CHECK_OUT)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${type === AttendanceType.CHECK_OUT ? 'bg-orange-50 border-orange-200 text-orange-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Ra ca (Check-out)
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 text-gray-600 font-medium text-sm rounded-xl hover:bg-gray-100 transition-colors"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={onSave}
            className="flex-1 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-200 active:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  // State
  const [view, setView] = useState<ViewState>('HOME');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState<boolean>(true);
  const [aiReport, setAiReport] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  
  // Edit State
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editTime, setEditTime] = useState<string>('');
  const [editType, setEditType] = useState<AttendanceType>(AttendanceType.CHECK_IN);

  // Computed State
  const lastRecord = records.length > 0 ? records[0] : null;
  const isCheckedIn = lastRecord?.type === AttendanceType.CHECK_IN;
  const isAdmin = MOCK_USER.role === 'ADMIN';

  // Clock Timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize Data
  useEffect(() => {
    const saved = localStorage.getItem('z_attendance_records');
    if (saved) {
      setRecords(JSON.parse(saved));
    }
    fetchLocation();
  }, []);

  const fetchLocation = useCallback(() => {
    setLocLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          setLocLoading(false);
        },
        (error) => {
          console.error("Geo error", error);
          setLocLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocLoading(false);
      alert("Thiết bị không hỗ trợ định vị.");
    }
  }, []);

  const handleAttendance = async () => {
    if (!location) {
      fetchLocation();
      return;
    }
    if (!capturedImage) {
      alert("Vui lòng chụp ảnh khuôn mặt để xác thực.");
      return;
    }

    setLoading(true);

    // Simulate Server Latency
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: isCheckedIn ? AttendanceType.CHECK_OUT : AttendanceType.CHECK_IN,
      coordinates: location,
      photoUrl: capturedImage,
      locationName: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
      isLate: false 
    };

    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);
    localStorage.setItem('z_attendance_records', JSON.stringify(updatedRecords));
    
    setLoading(false);
    setShowSuccess(true); // Trigger Success Animation

    // Auto hide success modal and reset after 2 seconds
    setTimeout(() => {
      setShowSuccess(false);
      setCapturedImage(null);
    }, 2000);
  };

  const handleGenerateReport = async () => {
    setAiLoading(true);
    const report = await generateAttendanceReport(records, MOCK_USER.name);
    setAiReport(report);
    setAiLoading(false);
  };

  // Edit Functions
  const openEditModal = (record: AttendanceRecord) => {
    if (!isAdmin) return;
    setEditingRecord(record);
    setEditTime(format(record.timestamp, 'HH:mm'));
    setEditType(record.type);
  };

  const saveEditRecord = () => {
    if (!editingRecord) return;

    const confirmUpdate = window.confirm("Bạn có chắc chắn muốn cập nhật dữ liệu chấm công này không?");
    if (!confirmUpdate) return;

    // Parse new time
    const [hours, minutes] = editTime.split(':').map(Number);
    const newTimestamp = new Date(editingRecord.timestamp);
    newTimestamp.setHours(hours, minutes);

    const updatedRecords = records.map(r => {
      if (r.id === editingRecord.id) {
        return {
          ...r,
          timestamp: newTimestamp.getTime(),
          type: editType
        };
      }
      return r;
    });

    // Sort records again by timestamp descending just in case
    updatedRecords.sort((a, b) => b.timestamp - a.timestamp);

    setRecords(updatedRecords);
    localStorage.setItem('z_attendance_records', JSON.stringify(updatedRecords));
    setEditingRecord(null);
  };

  const renderHome = () => (
    <div className="flex flex-col items-center animate-fade-in pb-6">
      <Header title="Chấm công trực tuyến" />
      
      {/* Clock Card */}
      <div className="w-full bg-white mb-2 p-6 flex flex-col items-center shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-300" />
        <div className="text-gray-500 text-sm uppercase font-medium tracking-wider mb-1">
          {format(currentTime, 'EEEE, dd/MM/yyyy', { locale: vi })}
        </div>
        <div className="text-5xl font-bold text-gray-800 tabular-nums tracking-tight">
          {format(currentTime, 'HH:mm:ss')}
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
          <Wifi className="w-4 h-4" />
          <span>Kết nối ổn định</span>
        </div>
      </div>

      {/* User Info */}
      <div className="w-full px-4 mb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 border border-gray-100">
           <img src={MOCK_USER.avatar} alt="Avatar" className="w-12 h-12 rounded-full bg-gray-200" />
           <div className="flex-1">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                {MOCK_USER.name}
                <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded border border-gray-200">
                  {MOCK_USER.role === 'ADMIN' ? 'Admin' : 'Nhân viên'}
                </span>
              </h3>
              <p className="text-sm text-gray-500">{MOCK_USER.department}</p>
              <p className="text-xs text-blue-600 mt-0.5">Ca: {MOCK_USER.shiftStart} - {MOCK_USER.shiftEnd}</p>
           </div>
           <div className={`px-3 py-1 rounded-lg text-xs font-bold ${isCheckedIn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
             {isCheckedIn ? 'ĐANG LÀM' : 'CHƯA VÀO'}
           </div>
        </div>
      </div>

      {/* Action Area */}
      <div className="w-full px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          
          {/* Location Status */}
          <div className="mb-4 flex items-start gap-3 text-sm">
            <div className={`p-2 rounded-full ${locLoading ? 'bg-yellow-100 text-yellow-600' : location ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-700">Vị trí hiện tại</div>
              {locLoading ? (
                <div className="text-gray-400 text-xs">Đang xác định tọa độ...</div>
              ) : location ? (
                <div className="text-gray-500 text-xs break-all">
                  Lat: {location.latitude.toFixed(6)} | Long: {location.longitude.toFixed(6)}
                  <br/>
                  <span className="text-green-600 font-medium flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" /> Trong vùng chấm công
                  </span>
                </div>
              ) : (
                <div className="text-red-500 text-xs">Không thể lấy vị trí. Hãy bật GPS.</div>
              )}
            </div>
            {!locLoading && !location && (
              <button onClick={fetchLocation} className="text-blue-600 text-xs font-medium">Thử lại</button>
            )}
          </div>

          {/* Camera */}
          <div className="mb-6">
             <div className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
               <span>Hình ảnh xác thực</span>
               {!capturedImage && <span className="text-red-500 text-xs">* Bắt buộc</span>}
             </div>
             <CameraCapture 
                onCapture={(src) => setCapturedImage(src)} 
                onRetake={() => setCapturedImage(null)}
             />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleAttendance}
            disabled={loading || !location || (!isCheckedIn && !capturedImage) || locLoading}
            className={`
              w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 relative overflow-hidden
              ${loading ? 'bg-gray-400 cursor-wait' : 
                isCheckedIn 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-orange-200' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-200'
              }
              ${(!location || (!isCheckedIn && !capturedImage)) ? 'opacity-50 grayscale' : ''}
            `}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                {isCheckedIn ? <Clock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                {isCheckedIn ? 'CHẤM CÔNG RA (CHECK-OUT)' : 'CHẤM CÔNG VÀO (CHECK-IN)'}
              </>
            )}
          </button>
          
          {!capturedImage && !isCheckedIn && (
            <div className="mt-3 text-center">
               <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">Chụp ảnh selfie để kích hoạt nút chấm công</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  const renderHistory = () => {
    // Group records by Date
    const groupedRecords = records.reduce((acc, record) => {
      const dateKey = format(record.timestamp, 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(record);
      return acc;
    }, {} as Record<string, AttendanceRecord[]>);

    // Sort dates descending (newest first)
    const sortedDates = Object.keys(groupedRecords).sort((a, b) => b.localeCompare(a));

    return (
      <div className="pb-6 animate-fade-in bg-gray-50 min-h-full">
        <Header title="Lịch sử chấm công" />
        <div className="p-4 space-y-3">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 text-gray-400">
              <Calendar className="w-16 h-16 mb-4 text-gray-300" />
              <p>Chưa có dữ liệu chấm công tháng này.</p>
            </div>
          ) : (
            sortedDates.map((dateKey) => {
              const dayRecords = groupedRecords[dateKey].sort((a, b) => a.timestamp - b.timestamp);
              const firstRecord = dayRecords[0]; // Use for extracting date info

              return (
                <div key={dateKey} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-4 items-start">
                  {/* Date Column */}
                  <div className="flex-shrink-0 w-16 text-center pt-1">
                    <div className="text-sm font-bold text-gray-800 uppercase">
                      {format(firstRecord.timestamp, 'EEE', { locale: vi })}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      {format(firstRecord.timestamp, 'dd/MM')}
                    </div>
                  </div>

                  {/* Records Timeline (Horizontal Wrap) */}
                  <div className="flex-1 flex flex-wrap gap-2 items-center pl-4 border-l border-gray-100">
                    {dayRecords.map((record) => (
                      <button
                        key={record.id}
                        onClick={isAdmin ? () => openEditModal(record) : undefined}
                        disabled={!isAdmin}
                        className={`
                          flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border text-sm font-medium transition-all
                          ${record.type === AttendanceType.CHECK_IN 
                            ? 'bg-blue-50 border-blue-100 text-blue-700' 
                            : 'bg-orange-50 border-orange-100 text-orange-700'
                          }
                          ${isAdmin ? 'hover:border-blue-300 active:scale-95 cursor-pointer' : 'cursor-default'}
                        `}
                      >
                        {/* Thumbnail Image */}
                        <img 
                          src={record.photoUrl} 
                          alt="Proof" 
                          className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                        
                        <div className="flex flex-col items-start leading-none">
                          <span className="text-[10px] opacity-70 mb-0.5">
                            {record.type === AttendanceType.CHECK_IN ? 'Vào' : 'Ra'}
                          </span>
                          <span className="font-mono font-bold text-xs">{format(record.timestamp, 'HH:mm')}</span>
                        </div>
                        
                        {isAdmin && <Edit2 className="w-3 h-3 opacity-40 ml-1" />}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderReport = () => (
    <div className="flex flex-col min-h-full bg-white animate-fade-in pb-6">
       <Header title="Trợ lý Nhân sự AI" />
       <div className="flex-1 p-4">
         <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-blue-100">
           <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600">
               <Sparkles className="w-6 h-6" />
             </div>
             <div>
               <h3 className="font-bold text-gray-800">Tổng hợp công</h3>
               <p className="text-xs text-gray-500">Powered by Google Gemini</p>
             </div>
           </div>
           <p className="text-gray-600 text-sm mb-4 leading-relaxed">
             Hệ thống sẽ phân tích dữ liệu giờ giấc vào/ra và hình ảnh để đưa ra nhận xét về mức độ chuyên cần của nhân viên <b>{MOCK_USER.name}</b>.
           </p>
           <button 
            onClick={handleGenerateReport}
            disabled={aiLoading || records.length === 0}
            className="w-full bg-white text-blue-600 px-4 py-3 rounded-xl text-sm font-bold shadow-sm border border-blue-200 active:bg-blue-50 disabled:opacity-60 transition-colors flex justify-center items-center gap-2"
          >
            {aiLoading ? (
              <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> Đang phân tích...</span>
            ) : (
              'Tạo báo cáo ngay'
            )}
          </button>
         </div>

         {aiReport && (
           <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 animate-slide-up">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <span className="font-bold text-gray-800">Kết quả đánh giá</span>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700 space-y-2">
                 {aiReport.split('\n').map((line, i) => (
                   <p key={i} className="text-sm leading-6">{line}</p>
                 ))}
              </div>
           </div>
         )}

         {records.length === 0 && (
           <div className="text-center text-gray-400 mt-10 flex flex-col items-center">
             <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
             <p className="text-sm">Chưa có dữ liệu để phân tích.</p>
           </div>
         )}
       </div>
    </div>
  );

  return (
    <div className="bg-[#F2F4F8] font-sans max-w-md mx-auto shadow-2xl flex flex-col overflow-hidden relative" style={{ height: '100dvh' }}>
      
      <SuccessOverlay show={showSuccess} isCheckedIn={isCheckedIn} />
      
      <EditModal 
        record={editingRecord}
        time={editTime}
        setTime={setEditTime}
        type={editType}
        setType={setEditType}
        onClose={() => setEditingRecord(null)}
        onSave={saveEditRecord}
      />

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain scroll-smooth relative no-scrollbar">
        {view === 'HOME' && renderHome()}
        {view === 'HISTORY' && renderHistory()}
        {view === 'REPORT' && renderReport()}
      </div>

      {/* Bottom Navigation - Flex Item (Sticky Bottom visually in Flex Col) */}
      <div className="bg-white border-t border-gray-200 pb-safe shrink-0 z-50">
        <div className="h-[60px] px-2 flex justify-around items-center">
          <button 
            onClick={() => setView('HOME')}
            className={`flex flex-col items-center justify-center w-1/3 h-full ${view === 'HOME' ? 'text-[#0068FF]' : 'text-gray-400'}`}
          >
            <Clock className={`w-6 h-6 mb-1 transition-transform ${view === 'HOME' ? 'scale-110' : ''}`} strokeWidth={view === 'HOME' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Chấm công</span>
          </button>

          <button 
            onClick={() => setView('HISTORY')}
            className={`flex flex-col items-center justify-center w-1/3 h-full ${view === 'HISTORY' ? 'text-[#0068FF]' : 'text-gray-400'}`}
          >
            <History className={`w-6 h-6 mb-1 transition-transform ${view === 'HISTORY' ? 'scale-110' : ''}`} strokeWidth={view === 'HISTORY' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Lịch sử</span>
          </button>

          <button 
            onClick={() => setView('REPORT')}
            className={`flex flex-col items-center justify-center w-1/3 h-full ${view === 'REPORT' ? 'text-[#0068FF]' : 'text-gray-400'}`}
          >
            <Sparkles className={`w-6 h-6 mb-1 transition-transform ${view === 'REPORT' ? 'scale-110' : ''}`} strokeWidth={view === 'REPORT' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Tiện ích</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;