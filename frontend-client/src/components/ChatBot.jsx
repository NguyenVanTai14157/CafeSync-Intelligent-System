import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../assets/css/chatbot.css';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);

    // SỬA TẠI ĐÂY: Khởi tạo messages trống để thiết lập lời chào động trong useEffect
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    // 1. Thiết lập lời chào động dựa trên trạng thái đăng nhập
    useEffect(() => {
        const token = localStorage.getItem('userToken');
        const savedName = localStorage.getItem('userName');

        let greeting = "Chào bạn! Mình là Syncie ☕. Hôm nay bạn muốn thưởng thức món gì nào?";

        // Chỉ chào tên nếu có cả Token và Tên trong máy
        if (token && savedName) {
            greeting = `Chào ${savedName}! Mình là Syncie ☕. Hôm nay bạn muốn thưởng thức món gì nào?`;
        }

        setMessages([{ role: 'assistant', content: greeting }]);
    }, []); // Chạy 1 lần duy nhất khi load component

    // Tự động cuộn xuống tin nhắn mới nhất
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setIsTyping(true);

        try {
            const res = await axios.post('https://cafesync-intelligent-system-sntf.onrender.com/api/ai/chat', {
                message: input,
                // Gửi tên nếu có, không thì gửi "Khách" để AI biết đường xưng hô
                userName: localStorage.getItem('userName') || 'Khách'
            });
            setMessages([...newMessages, { role: 'assistant', content: res.data.reply }]);
        } catch (error) {
            setMessages([...newMessages, { role: 'assistant', content: 'Syncie đang bận pha cà phê xíu, bạn đợi tí nha!' }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="syncie-wrapper">
            {/* Nút bong bóng Chat */}
            <div className={`syncie-bubble ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)}>
                <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-chat-quote-fill'}`}></i>
            </div>

            {/* Cửa sổ Chat chuẩn Premium */}
            {isOpen && (
                <div className="syncie-window animate__animated animate__fadeInUp">
                    <div className="syncie-header">
                        <div className="d-flex align-items-center">
                            <div className="syncie-avatar">
                                <i className="bi bi-robot"></i>
                                <span className="syncie-online-dot"></span>
                            </div>
                            <div className="ms-2">
                                <h6 className="mb-0 fw-bold">Syncie</h6>
                                <small style={{ fontSize: '0.7rem', opacity: 0.8 }}>Trợ lý ảo CaféSync</small>
                            </div>
                        </div>
                        <i className="bi bi-dash-lg cursor-pointer" onClick={() => setIsOpen(false)}></i>
                    </div>

                    <div className="syncie-body" ref={scrollRef}>
                        {messages.map((msg, index) => (
                            <div key={index} className={`syncie-msg-item ${msg.role}`}>
                                <div className="syncie-msg-content shadow-sm">
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="syncie-msg-item assistant">
                                <div className="syncie-msg-content typing-dots">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                    </div>

                    <form className="syncie-footer" onSubmit={handleSendMessage}>
                        <input
                            type="text"
                            placeholder="Hỏi Syncie..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <button type="submit" disabled={!input.trim()}>
                            <i className="bi bi-send-fill"></i>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Chatbot;