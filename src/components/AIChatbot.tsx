import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';

const AIChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: "Hello! I'm your Rays of Moment assistant. How can I help you today? I can guide you through our photography packages, portfolio, or help you book a session." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `You are a helpful and professional customer assistant for Rays of Moment Photography. 
            Company Info:
            - Established in 2019.
            - Specializes in Weddings, Events, Portraits, and Commercial photography.
            - Based in Berhampore, West Bengal.
            - Phone: 8967106723, 9083486788.
            - Email: raysofmoment@raysofmoment.com.
            - Social Media: Instagram (https://www.instagram.com/rays.of.moment/), Facebook (https://www.facebook.com/Raysofmoment), WhatsApp (https://wa.me/918967106723), LinkedIn (https://linkedin.com).
            - Offers packages starting from ₹15,000 (Portraits) up to ₹2,50,000 (Wedding Premium).
            - Has a team of 15+ photographers.
            - Website features: Dashboard, Order Management, Team Management, and Photo Galleries.
            
            User message: ${userMessage}` }]
          }
        ],
        config: {
          systemInstruction: "Be concise, friendly, and professional. Guide the user to relevant pages like /packages, /orders, or /gallery if needed. Always mention that Rays of Moment is dedicated to capturing moments and preserving memories.",
        }
      });

      const aiResponse = response.text || "I'm sorry, I couldn't process that. How else can I help you?";
      setMessages(prev => [...prev, { role: 'model', text: aiResponse }]);
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having a bit of trouble connecting right now. Please try again in a moment!" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-[350px] sm:w-[400px] h-[500px] flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="bg-black p-6 flex items-center justify-between text-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold">Rays of Moment Assistant</h3>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Online</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                    msg.role === 'user' 
                    ? 'bg-black text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 rounded-tl-none flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-xs text-gray-400">Assistant is typing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-grow bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-all"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-black text-white p-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'bg-white text-black rotate-90' : 'bg-black text-white hover:scale-110'
        }`}
      >
        {isOpen ? <X className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
      </button>
    </div>
  );
};

export default AIChatbot;
