"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ViewType } from '@/types';
import { clsx } from "clsx";

interface ChatViewProps {
  onViewChange?: (view: ViewType) => void;
  onNavigateToday?: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ onViewChange, onNavigateToday }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Chat Content Area */}
      <div className="flex-grow overflow-y-auto flex flex-col items-center pt-12 pb-32 px-6 custom-scrollbar">
        <div className="w-full max-w-3xl space-y-10">

          {/* User Message */}
          <div className="flex justify-end pr-2">
            <div className="bg-white text-black px-6 py-4 border-2 border-black max-w-[80%] brutal-shadow">
              <p className="text-sm font-bold leading-relaxed">Get a detailed project workflow for the new calendar onboarding.</p>
            </div>
            <div className="ml-4 mt-1 w-10 h-10 border-2 border-black flex items-center justify-center text-black text-xs font-black flex-shrink-0 uppercase tracking-wider bg-white">
              JD
            </div>
          </div>

          {/* AI Response Block */}
          <div className="flex items-start gap-5">
            <div className="mt-1 w-10 h-10 border-2 border-black bg-black flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-white text-[22px]">auto_awesome</span>
            </div>

            <div className="space-y-6 w-full">
              {/* Thought Process Accordion */}
              <div className="space-y-3">
                <button className="flex items-center gap-2 text-fg-subtle text-[10px] font-bold uppercase tracking-widest hover:text-foreground transition-all">
                  <span className="material-symbols-outlined text-[16px]">psychology</span>
                  <span>Reasoning Model</span>
                  <span className="material-symbols-outlined text-[16px] opacity-40">expand_more</span>
                </button>
                <div className="flex items-center gap-3 text-[10px] font-bold text-fg-subtle uppercase tracking-widest opacity-60">
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  <span>Analysis complete</span>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] text-fg-muted border border-white/5">
                    <span className="material-symbols-outlined text-[12px]">dataset</span> Documentation
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="text-foreground space-y-8 bg-white p-8 border-2 border-black brutal-shadow">
                <div>
                  <h3 className="text-xl font-black tracking-tight mb-4 text-black uppercase">Next-Gen Interface Strategy</h3>
                  <ul className="space-y-4">
                    <li className="flex gap-3 leading-relaxed text-fg-muted font-bold text-sm">
                      <span className="text-black font-black">•</span>
                      <span>Focused on building a high-density, neutral design system that prioritizes clarity and restraint.</span>
                    </li>
                    <li className="flex gap-3 leading-relaxed text-fg-muted font-bold text-sm">
                      <span className="text-black font-black">•</span>
                      <span>Reducing cognitive load via consistent spatial relationships and intentional negative space.</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-black mb-4 pb-2 border-b-2 border-black">Referenced Nodes</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { icon: 'description', label: 'Onboarding System' },
                      { icon: 'analytics', label: 'User Flow Discovery' }
                    ].map((ref, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 border-2 border-black hover:bg-black hover:text-white brutal-transition cursor-pointer group bg-white">
                        <span className="material-symbols-outlined text-black group-hover:text-white brutal-transition">{ref.icon}</span>
                        <span className="text-xs font-bold text-black group-hover:text-white brutal-transition uppercase tracking-wider">{ref.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center px-6">
        <div className="w-full max-w-3xl bg-white border-2 border-black brutal-shadow p-3 flex items-center gap-3 relative">

          {/* Add Button & Menu */}
          <div className="relative flex-shrink-0">
            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute bottom-full left-0 mb-4 w-64 bg-white border-2 border-black brutal-shadow z-50 overflow-hidden p-2 animate-slide-in origin-bottom-left">
                  {[
                    { id: 'today', icon: 'today', label: 'Navigate to Today' },
                    { id: 'week', icon: 'view_week', label: 'Switch to Week' },
                    { id: 'month', icon: 'calendar_month', label: 'Switch to Month' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === 'today') onNavigateToday?.();
                        else onViewChange?.(item.id as ViewType);
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-4 px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-black hover:bg-black hover:text-white brutal-transition text-left border-2 border-transparent hover:border-black"
                    >
                      <span className="material-symbols-outlined text-black text-[20px]">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={clsx(
                "w-12 h-12 flex items-center justify-center brutal-transition border-2",
                isMenuOpen
                  ? "bg-black text-white rotate-45 border-black"
                  : "bg-white text-black border-black hover:bg-black hover:text-white"
              )}
            >
              <span className="material-symbols-outlined text-[28px]">add</span>
            </button>
          </div>

          {/* Textarea */}
          <textarea
            className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-foreground placeholder-fg-subtle resize-none py-4 px-3 text-[15px] font-bold leading-relaxed"
            placeholder="Search projects, ask questions, or navigate..."
            rows={1}
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />

          {/* Right Buttons */}
          <div className="flex items-center gap-2 mr-1 flex-shrink-0">
            <button className="w-10 h-10 flex items-center justify-center border-2 border-black bg-black text-white hover:scale-105 active:scale-95 brutal-bounce">
              <span className="material-symbols-outlined text-[20px] font-bold">arrow_upward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;