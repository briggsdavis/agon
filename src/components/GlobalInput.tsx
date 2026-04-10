import React, { forwardRef, useState, useRef, useImperativeHandle, useEffect } from 'react';
import { DashboardId, DashboardState, SHORTCUT_MAP } from '../types';
import { cn } from '../lib/utils';

interface GlobalInputProps {
  onAdd: (content: string, dashboardId: DashboardId) => void;
  targetDashboard: DashboardId | null;
  setTargetDashboard: (id: DashboardId | null) => void;
  dashboards: DashboardState[];
}

export interface GlobalInputHandle {
  focus: () => void;
}

export const GlobalInput = forwardRef<GlobalInputHandle, GlobalInputProps>(
  ({ onAdd, targetDashboard, setTargetDashboard, dashboards }, ref) => {
    const [step, setStep] = useState<'dashboard' | 'task'>('dashboard');
    const [letter, setLetter] = useState('');
    const [taskContent, setTaskContent] = useState('');
    
    const letterInputRef = useRef<HTMLInputElement>(null);
    const taskInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        if (step === 'dashboard') {
          letterInputRef.current?.focus();
        } else {
          taskInputRef.current?.focus();
        }
      }
    }));

    // Reverse map for shortcuts to letters
    const REVERSE_SHORTCUT_MAP = Object.entries(SHORTCUT_MAP).reduce((acc, [key, val]) => {
      acc[val] = key;
      return acc;
    }, {} as Record<string, string>);

    const handleLetterKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (letter.trim()) {
          const dashboardId = SHORTCUT_MAP[letter.toLowerCase()];
          if (dashboardId) {
            setTargetDashboard(dashboardId);
            setStep('task');
            setTimeout(() => taskInputRef.current?.focus(), 0);
          }
        }
      }
    };

    const handleTaskKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (taskContent.trim() && targetDashboard) {
          onAdd(taskContent.trim(), targetDashboard);
          setTaskContent('');
          setLetter(''); 
          setTargetDashboard(null); // Reset dashboard selection
          setStep('dashboard');
          setTimeout(() => letterInputRef.current?.focus(), 0);
        }
      } else if (e.key === 'Backspace' && taskContent === '') {
        setStep('dashboard');
        setTimeout(() => letterInputRef.current?.focus(), 0);
      }
    };

    const handleLetterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.toLowerCase().slice(-1);
      // Only update the letter state, don't update targetDashboard yet
      if (SHORTCUT_MAP[val] || val === '') {
        setLetter(val);
      }
    };

    const activeDashboard = dashboards.find(d => d.id === targetDashboard);

    return (
      <div className="w-full max-w-xl flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-2xl w-full">
          {/* Step 1: Dashboard Letter */}
          <div className={cn(
            "relative flex items-center justify-center w-12 pb-1 transition-all duration-300",
            step === 'dashboard' ? "border-b border-black" : "border-b border-transparent opacity-40"
          )}>
            <input
              ref={letterInputRef}
              type="text"
              value={letter}
              onChange={handleLetterChange}
              onKeyDown={handleLetterKeyDown}
              onFocus={() => setStep('dashboard')}
              placeholder="?"
              className="w-full text-center bg-transparent uppercase placeholder:opacity-20"
              maxLength={1}
            />
          </div>

          <span className="opacity-20">/</span>

          {/* Step 2: Task Content */}
          <div className={cn(
            "relative flex-1 pb-1 transition-all duration-300",
            step === 'task' ? "border-b border-black" : "border-b border-transparent opacity-40"
          )}>
            <input
              ref={taskInputRef}
              type="text"
              value={taskContent}
              onChange={(e) => setTaskContent(e.target.value)}
              onKeyDown={handleTaskKeyDown}
              onFocus={() => setStep('task')}
              placeholder={step === 'task' ? `Add to ${activeDashboard?.label}...` : "..."}
              className="w-full bg-transparent placeholder:opacity-20"
            />
          </div>
        </div>

        {/* Legend / Shortcuts */}
        <div className="flex gap-4 justify-center">
          {dashboards.map(d => {
            const char = REVERSE_SHORTCUT_MAP[d.id];
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setTargetDashboard(d.id);
                  setLetter(char);
                  setStep('task');
                  setTimeout(() => taskInputRef.current?.focus(), 0);
                }}
                className={cn(
                  "text-[10px] uppercase tracking-tighter transition-all flex flex-col items-center",
                  targetDashboard === d.id ? "opacity-100 font-bold" : "opacity-20 hover:opacity-50"
                )}
                style={{ color: targetDashboard === d.id ? d.color : 'black' }}
              >
                <span className="text-[8px] opacity-50">[{char}]</span>
                {d.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);

GlobalInput.displayName = 'GlobalInput';
