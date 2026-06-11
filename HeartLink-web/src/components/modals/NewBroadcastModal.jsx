import React, { useState, useEffect } from "react";
import { X, Send } from "lucide-react";

const NewBroadcastModal = ({ isOpen, onClose, onPublish }) => {
  const [msg, setMsg] = useState("");
  const [type, setType] = useState("Maintenance");
  const [targetAudience, setTargetAudience] = useState("All Registered Accounts");

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMsg("");
      setType("Maintenance");
      setTargetAudience("All Registered Accounts");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePublish = () => {
    if (msg.trim().length > 0) {
      onPublish(type, msg, targetAudience);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>
      <div className="relative w-full max-w-md bg-slate-50 max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white shadow-sm z-10">
          <div>
            <h3 className="text-sm font-bold text-slate-900">New Broadcast</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Configure system push notification</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 flex-1 space-y-5 overflow-y-auto custom-scrollbar">
          {/* Target Audience Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-2">
              Target Audience
            </label>
            <div className="flex flex-col gap-2">
              {["All Registered Accounts", "High-Risk Individuals Only", "System Staff Only"].map((option) => (
                <label 
                  key={option} 
                  onClick={() => setTargetAudience(option)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${targetAudience === option ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${targetAudience === option ? 'border-white bg-white' : 'border-slate-300'}`}>
                    {targetAudience === option && <div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div>}
                  </div>
                  <span className={`text-[11px] font-semibold ${targetAudience === option ? 'text-white' : 'text-slate-600'}`}>{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-2">
              Category
            </label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value)} 
              className="w-full px-4 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-colors shadow-sm cursor-pointer text-slate-800"
            >
              <option value="Maintenance">Maintenance</option>
              <option value="App Update">App Update</option>
              <option value="Safety Reminder">Safety Reminder</option>
              <option value="General">General</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-2">
              Broadcast Message
            </label>
            <textarea 
              rows="5"
              maxLength={255}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="w-full px-4 py-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-colors resize-none leading-relaxed shadow-sm"
              placeholder="Draft your announcement (max 255 chars)..."
            ></textarea>
            <div className="flex justify-end mt-1.5">
              <p className={`text-[10px] font-bold ${msg.length >= 255 ? 'text-red-500' : 'text-slate-400'}`}>
                {msg.length} / 255 characters
              </p>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex shrink-0">
          <button 
            onClick={handlePublish} 
            disabled={!msg.trim()} 
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold text-white rounded-xl transition-all shadow-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={15} /> Publish Broadcast Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewBroadcastModal;
