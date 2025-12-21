"use client";

import React from "react";
import { motion } from "framer-motion";
import { ViewType } from "@/types";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface ViewSwitcherProps {
    currentView: ViewType;
    onChange: (view: ViewType) => void;
}

export default function ViewSwitcher({ currentView, onChange }: ViewSwitcherProps) {
    const items = [
        { id: "day", label: "Day" },
        { id: "week", label: "Week" },
        { id: "month", label: "Month" },
        { id: "chat", label: "Chat" },
    ] as const;

    return (
        <div className="flex items-center bg-white border-2 border-black p-0.5 gap-0.5 relative h-10">
            {items.map((item) => {
                const isActive = currentView === item.id;
                const isChat = item.id === "chat";

                return (
                    <button
                        key={item.id}
                        onClick={() => onChange(item.id)}
                        className={twMerge(
                            "relative px-5 h-full text-sm font-bold transition-all brutal-transition outline-none border-2 border-transparent",
                            isActive ? "bg-black text-white border-black" : "bg-white text-black hover:border-black",
                            isChat && "ml-1.5 border-l-2 border-l-black pl-5"
                        )}
                        style={{
                            WebkitTapHighlightColor: "transparent",
                        }}
                    >
                        <span className="relative flex items-center justify-center gap-1.5 whitespace-nowrap">
                            {isChat && <span className="material-symbols-outlined text-[16px]">auto_awesome</span>}
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
