import { GoogleGenAI } from "@google/genai";
import { AttendanceRecord, AttendanceType } from "../types";

const parseHistoryForPrompt = (records: AttendanceRecord[]): string => {
  return records.map(r => 
    `- ${new Date(r.timestamp).toLocaleString('vi-VN')}: ${r.type === AttendanceType.CHECK_IN ? 'CHECK IN' : 'CHECK OUT'} | Tọa độ: ${r.coordinates.latitude}, ${r.coordinates.longitude}`
  ).join('\n');
};

export const generateAttendanceReport = async (records: AttendanceRecord[], userName: string): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Chưa cấu hình API Key. Vui lòng kiểm tra file .env.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Sort records by time descending
    const sortedRecords = [...records].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10); 
    const historyText = parseHistoryForPrompt(sortedRecords);

    const prompt = `
      Vai trò: Bạn là Trợ lý Ảo Quản trị Nhân sự (HR Admin Assistant) của hệ thống chấm công Zalo.
      Nhiệm vụ: Tổng hợp báo cáo nhanh cho quản lý về tình hình chấm công của nhân viên ${userName}.

      Dữ liệu chấm công gần đây:
      ${historyText}

      Yêu cầu báo cáo:
      1. Tóm tắt trạng thái: Nhân viên này có đi làm đều không? Giờ giấc có ổn định theo khung 8:00 - 17:30 không?
      2. Cảnh báo: Nếu có lần check-in quá muộn (>8:15) hoặc check-out quá sớm (<17:15), hãy liệt kê cụ thể.
      3. Nhận xét chung: Đưa ra một lời đánh giá ngắn gọn, khách quan để gửi cho bộ phận quản lý.
      
      Phong cách: Ngắn gọn, súc tích, chuyên nghiệp (Business Casual), dùng bullet points. Không dùng markdown header quá lớn. Dùng biểu tượng ✅ (Tốt), ⚠️ (Cảnh báo) hợp lý.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Không thể tạo báo cáo lúc này.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Hệ thống AI đang bận. Vui lòng thử lại sau.";
  }
};
