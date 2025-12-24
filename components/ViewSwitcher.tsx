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
        { id: "chat", label: "Chat" },
        { id: "day", label: "Day" },
        { id: "week", label: "Week" },
        { id: "month", label: "Month" },
    ] as const;

    return (
        <div className="flex items-center bg-card p-1 rounded-lg border border-border relative">
            {items.map((item) => {
                const isActive = currentView === item.id;
                const isChat = item.id === "chat";

                return (
                    <React.Fragment key={item.id}>


                        <button
                            onClick={() => onChange(item.id)}
                            className={twMerge(
                                "relative px-3 py-1 text-xs font-medium rounded-md transition-colors z-10 outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                                isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                                isChat && "flex items-center gap-1"
                            )}
                            style={{
                                WebkitTapHighlightColor: "transparent",
                            }}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="active-pill"
                                    className={clsx(
                                        "absolute inset-0 shadow-sm z-[-1]",
                                        "bg-primary"
                                    )}
                                    style={{ borderRadius: 6 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 30
                                    }}
                                />
                            )}
                            <span className="relative z-10">{item.label}</span>
                        </button>
                    </React.Fragment>
                );
            })}
        </div>
    );
}
