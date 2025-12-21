import React, { useState, useRef, useEffect } from 'react';

interface TimePickerProps {
    value: string; // "HH:mm" 24h format
    onChange: (value: string) => void;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Refs for scrolling to selected items
    const hoursRef = useRef<HTMLButtonElement>(null);
    const minutesRef = useRef<HTMLButtonElement>(null);
    const periodRef = useRef<HTMLButtonElement>(null);

    // Parse current value
    const [hours24, minutes] = value.split(':').map(Number);
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const displayHours = hours24 % 12 || 12; // Convert 0 to 12

    const toggleOpen = () => setIsOpen(!isOpen);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Scroll to selected items
            setTimeout(() => {
                hoursRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                minutesRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                periodRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }, 100);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleHourChange = (newHour: number) => {
        let h24 = newHour;
        if (period === 'PM' && newHour !== 12) h24 = newHour + 12;
        if (period === 'AM' && newHour === 12) h24 = 0;

        onChange(`${h24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    };

    const handleMinuteChange = (newMinute: number) => {
        onChange(`${hours24.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`);
    };

    const handlePeriodChange = (newPeriod: 'AM' | 'PM') => {
        let h24 = hours24;
        if (newPeriod === 'AM' && h24 >= 12) h24 -= 12;
        if (newPeriod === 'PM' && h24 < 12) h24 += 12;

        onChange(`${h24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    };

    // Generate arrays
    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutesList = Array.from({ length: 60 }, (_, i) => i); // 0..59

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={toggleOpen}
                className={`
                    flex items-center gap-3 px-3 py-2 rounded-xl transition-all border
                    ${isOpen ? 'bg-white/5 border-white/20 text-foreground' : 'bg-white/[0.03] border-white/5 text-fg-muted hover:bg-white/5 hover:text-foreground'}
                `}
            >
                <div className="flex items-center gap-1.5 font-bold tracking-tight">
                    <span className="text-sm">
                        {displayHours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
                    </span>
                    <span className="text-[10px] uppercase opacity-50">{period}</span>
                </div>
                <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-3 z-50 flex flex-col bg-surface-overlay border border-border shadow-premium-lg rounded-2xl overflow-hidden w-[280px] animate-spring-in origin-top-left">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border bg-canvas/30 p-1">
                        <div className="flex-1 text-center py-2 text-[9px] font-bold text-fg-subtle uppercase tracking-[0.2em]">Hrs</div>
                        <div className="flex-1 text-center py-2 text-[9px] font-bold text-fg-subtle uppercase tracking-[0.2em] border-l border-border">Min</div>
                        <div className="flex-1 text-center py-2 text-[9px] font-bold text-fg-subtle uppercase tracking-[0.2em] border-l border-border">Prd</div>
                    </div>

                    <div className="flex h-56">
                        {/* Hours Column */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth py-2">
                            {hours.map(h => (
                                <button
                                    key={h}
                                    ref={displayHours === h ? hoursRef : null}
                                    onClick={() => handleHourChange(h)}
                                    className={`w-full py-2 text-xs font-bold transition-all ${displayHours === h
                                        ? 'text-accent'
                                        : 'text-fg-muted hover:bg-white/[0.02] hover:text-foreground'
                                        }`}
                                >
                                    {h.toString().padStart(2, '0')}
                                </button>
                            ))}
                        </div>

                        {/* Minutes Column */}
                        <div className="flex-1 border-l border-border overflow-y-auto custom-scrollbar scroll-smooth py-2">
                            {minutesList.map(m => (
                                <button
                                    key={m}
                                    ref={minutes === m ? minutesRef : null}
                                    onClick={() => handleMinuteChange(m)}
                                    className={`w-full py-2 text-xs font-bold transition-all ${minutes === m
                                        ? 'text-accent'
                                        : 'text-fg-muted hover:bg-white/[0.02] hover:text-foreground'
                                        }`}
                                >
                                    {m.toString().padStart(2, '0')}
                                </button>
                            ))}
                        </div>

                        {/* Period Column */}
                        <div className="flex-1 border-l border-border bg-canvas/20 flex flex-col justify-center gap-2 p-2">
                            {['AM', 'PM'].map(p => (
                                <button
                                    key={p}
                                    ref={period === p ? periodRef : null}
                                    onClick={() => handlePeriodChange(p as 'AM' | 'PM')}
                                    className={`w-full py-3 text-[10px] font-bold rounded-xl transition-all border ${period === p
                                        ? 'bg-foreground text-background border-foreground shadow-premium-sm'
                                        : 'text-fg-muted hover:bg-white/5 hover:text-foreground border-transparent'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimePicker;
