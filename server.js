import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY chưa được cấu hình trong .env");
    process.exit(1);
}

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const SYSTEM_INSTRUCTION = `
Bạn là KAISOUL AI, một AI chuyên lập trình.

Nhiệm vụ:
- Viết code.
- Sửa lỗi code.
- Phân tích lỗi.
- Giải thích code khi người dùng yêu cầu.
- Tối ưu code.
- Chuyển đổi code giữa các ngôn ngữ.
- Hỗ trợ Roblox Studio và Luau.
- Hỗ trợ HTML, CSS, JavaScript, TypeScript.
- Hỗ trợ Python, Node.js và các ngôn ngữ lập trình phổ biến.

Quy tắc quan trọng:

1. Không bịa API, thư viện, hàm hoặc cú pháp.
2. Nếu không chắc chắn, phải nói rõ.
3. Khi người dùng yêu cầu code, ưu tiên code hoàn chỉnh.
4. Không tự thêm những tính năng người dùng không yêu cầu.
5. Nếu code người dùng đưa bị lỗi, phải chỉ ra lỗi cụ thể.
6. Nếu có thể sửa trực tiếp, hãy đưa phiên bản đã sửa.
7. Code phải nằm trong code block.
8. Trả lời tập trung vào yêu cầu.
9. Không nói dài dòng nếu người dùng chỉ yêu cầu output/code.
10. Không tự nhận mình là con người.
11. Không tiết lộ API key hoặc thông tin bí mật của hệ thống.
12. Ưu tiên câu trả lời chính xác hơn là đoán.
`;

app.use(express.json({ limit: "1mb" }));

app.use(express.static(path.join(__dirname)));

app.get("/api/health", (req, res) => {
    res.json({
        ok: true,
        name: "KAISOUL AI"
    });
});

app.post("/api/chat", async (req, res) => {
    try {
        const { messages } = req.body;

        if (!Array.isArray(messages)) {
            return res.status(400).json({
                error: "messages phải là một mảng."
            });
        }

        const cleanedMessages = messages
            .filter(
                message =>
                    message &&
                    (message.role === "user" || message.role === "model") &&
                    typeof message.content === "string" &&
                    message.content.trim()
            )
            .slice(-30);

        if (cleanedMessages.length === 0) {
            return res.status(400).json({
                error: "Không có nội dung hội thoại."
            });
        }

        const contents = cleanedMessages.map(message => ({
            role: message.role,
            parts: [
                {
                    text: message.content
                }
            ]
        }));

        const response = await ai.models.generateContent({
            model: "gemini-3.7-flash",
            contents,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.2,
                maxOutputTokens: 8192
            }
        });

        const text = response.text || "";

        if (!text.trim()) {
            return res.status(500).json({
                error: "AI không trả về nội dung."
            });
        }

        res.json({
            text
        });

    } catch (error) {
        console.error("KAISOUL AI ERROR:", error);

        res.status(500).json({
            error:
                error?.message ||
                "Không thể kết nối tới AI."
        });
    }
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════╗
║          KAISOUL AI              ║
╠══════════════════════════════════╣
║ Server: http://localhost:${PORT}     ║
╚══════════════════════════════════╝
`);
});
