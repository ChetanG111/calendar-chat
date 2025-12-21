"use client";

import React from 'react';
import { ViewType } from '@/types';
import { clsx } from "clsx";

interface ChatViewProps {
  onViewChange?: (view: ViewType) => void;
  onNavigateToday?: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ onViewChange, onNavigateToday }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="flex flex-col h-full bg-background-dark relative overflow-hidden">
      {/* Chat Content Area */}
      <div className="flex-grow overflow-y-auto flex flex-col items-center pt-8 pb-32 px-4 custom-scrollbar">
        <div className="w-full max-w-3xl space-y-8">

          {/* User Message */}
          <div className="flex justify-end">
            <div className="bg-surface-dark text-gray-100 px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%] border border-border-dark">
              Get a detailed project workflow for the new calendar onboarding.
            </div>
            <div className="ml-3 mt-1 w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-black flex-shrink-0">
              JD
            </div>
          </div>

          {/* AI Response Block */}
          <div className="flex items-start gap-4">
            <div className="mt-1 w-8 h-8 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-gray-400 text-sm">smart_toy</span>
            </div>

            <div className="space-y-4 w-full">
              {/* Thought Process Accordion (Mock) */}
              <div className="space-y-2">
                <button className="flex items-center gap-2 text-gray-500 text-sm hover:text-gray-300 transition-colors">
                  <span className="material-symbols-outlined text-sm">lightbulb</span>
                  <span>Thinking Process</span>
                  <span className="material-symbols-outlined text-sm">expand_more</span>
                </button>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  <span>Viewed</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">
                    <span className="material-symbols-outlined text-[10px]">videocam</span> Onboarding Demo
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="text-gray-200 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-white">Shaping the AI Chat Experience</h3>
                  <ul className="space-y-3 list-disc pl-4 marker:text-gray-500">
                    <li className="leading-relaxed text-gray-300">
                      During the session, the team presented the overall product vision focused on building a modern AI chat experience that feels intuitive.
                      <span className="inline-flex align-middle items-center justify-center w-5 h-5 ml-2 rounded bg-surface-dark border border-border-dark text-[10px] text-gray-400 font-medium">N</span>
                    </li>
                    <li className="leading-relaxed text-gray-300">
                      Key emphasis was placed on clarity of interaction, reducing cognitive load, and ensuring responses feel helpful.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-white">Key Takeaways</h3>
                  <ol className="space-y-3 list-decimal pl-4 marker:text-gray-500 text-gray-300">
                    <li className="pl-1">Scale from onboarding demos to advanced workflows.</li>
                    <li className="pl-1">Primary interface for user interaction, prioritizing simplicity.</li>
                  </ol>
                </div>

                {/* References */}
                <div className="pt-2">
                  <p className="text-xs font-medium text-gray-500 mb-2">12 results found</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group border border-transparent hover:border-border-dark">
                      <span className="material-symbols-outlined text-gray-400">article</span>
                      <span className="text-sm text-blue-400 underline decoration-gray-700 underline-offset-4 group-hover:text-blue-300">Customer Feedback: Aggregated Insights</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group border border-transparent hover:border-border-dark">
                      <span className="material-symbols-outlined text-gray-400">analytics</span>
                      <span className="text-sm text-blue-400 underline decoration-gray-700 underline-offset-4 group-hover:text-blue-300">Sales Performance Metrics</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
        <div className="w-full max-w-3xl bg-surface-dark rounded-[2rem] p-2 shadow-2xl border border-border-dark flex items-center gap-2 relative">

          {/* Add Button & Menu */}
          <div className="relative flex-shrink-0 ml-1">
            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute bottom-12 left-0 w-52 bg-zinc-800/95 backdrop-blur-sm border border-zinc-700 rounded-2xl shadow-2xl z-50 overflow-hidden py-1.5 mb-2 transform origin-bottom-left animate-in fade-in zoom-in-95 duration-200">
                  <button
                    onClick={() => { onNavigateToday?.(); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[15px] text-gray-200 hover:bg-white/10 transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-gray-400 text-[20px]">today</span>
                    Today
                  </button>
                  <button
                    onClick={() => { onViewChange?.('week'); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[15px] text-gray-200 hover:bg-white/10 transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-gray-400 text-[20px]">view_week</span>
                    Week
                  </button>
                  <button
                    onClick={() => { onViewChange?.('month'); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[15px] text-gray-200 hover:bg-white/10 transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-gray-400 text-[20px]">calendar_month</span>
                    Month
                  </button>
                </div>
              </>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={clsx(
                "w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200",
                isMenuOpen
                  ? "text-white rotate-45"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <span className="material-symbols-outlined text-[24px]">add</span>
            </button>
          </div>

          {/* Textarea */}
          <textarea
            className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-white placeholder-gray-500 resize-none py-3 px-2 text-base"
            placeholder="Ask AI anything..."
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />

          {/* Right Buttons */}
          <div className="flex items-center gap-2 mr-1 flex-shrink-0">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white hover:brightness-110 transition-colors">
              <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;