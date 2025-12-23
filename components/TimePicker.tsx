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
    const [hours24 = 0, minutes = 0] = (value || '00:00').split(':').map(Number);
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
                        flex items-center gap-2 px-3 py-1.5 rounded transition-all border
                        ${isOpen ? 'bg-accent border-blue-500 text-blue-400 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]' : 'bg-transparent border-border text-foreground hover:bg-accent'}
                    `}
                >
                    <span className="text-sm font-medium tracking-wide">
                        {displayHours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">{period}</span>
                </button>
    
                {isOpen && (
                    <div className="absolute top-full right-0 mt-2 z-50 flex flex-col bg-popover/95 backdrop-blur-xl border border-border shadow-2xl rounded-xl overflow-hidden w-[240px] animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-border/10">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-border/50 bg-muted/50">
                            <div className="flex-1 text-center py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hrs</div>
                            <div className="flex-1 text-center py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-l border-border/50">Min</div>
                            <div className="flex-1 text-center py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-l border-border/50">AM/PM</div>
                        </div>
    
                        <div className="flex h-56">
                            {/* Hours Column */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth py-1">
                                {hours.map(h => (
                                    <button
                                        key={h}
                                        ref={displayHours === h ? hoursRef : null}
                                        onClick={() => handleHourChange(h)}
                                        className={`w-full py-1.5 text-sm transition-colors ${displayHours === h
                                            ? 'bg-blue-500/20 text-blue-400 font-semibold'
                                            : 'text-muted-foreground hover:bg-accent hover:text-foreground font-medium'
                                            }`}
                                    >
                                        {h}
                                    </button>
                                ))}
                            </div>
    
                            {/* Minutes Column */}
                            <div className="flex-1 border-l border-border/50 overflow-y-auto custom-scrollbar scroll-smooth py-1">
                                {minutesList.map(m => (
                                    <button
                                        key={m}
                                        ref={minutes === m ? minutesRef : null}
                                        onClick={() => handleMinuteChange(m)}
                                        className={`w-full py-1.5 text-sm transition-colors ${minutes === m
                                            ? 'bg-blue-500/20 text-blue-400 font-semibold'
                                            : 'text-muted-foreground hover:bg-accent hover:text-foreground font-medium'
                                            }`}
                                    >
                                        {m.toString().padStart(2, '0')}
                                    </button>
                                ))}
                            </div>
    
                            {/* Period Column */}
                            <div className="flex-1 border-l border-border/50 bg-muted/30 flex flex-col justify-center gap-1 p-1">
                                {['AM', 'PM'].map(p => (
                                    <button
                                        key={p}
                                        ref={period === p ? periodRef : null}
                                        onClick={() => handlePeriodChange(p as 'AM' | 'PM')}
                                        className={`w-full py-2 text-xs font-bold rounded transition-all ${period === p
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
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
        );};

export default TimePicker;
