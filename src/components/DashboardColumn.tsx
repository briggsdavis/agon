import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, LayoutGrid } from 'lucide-react';
import { Task, DashboardState } from '../types';
import { TaskItem } from './TaskItem';
import { cn } from '../lib/utils';

interface DashboardColumnProps {
  dashboard: DashboardState;
  tasks: Task[];
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onToggleMinimize: () => void;
}

export function DashboardColumn({
  dashboard,
  tasks,
  onDelete,
  onToggle,
  onEdit,
  onToggleMinimize,
}: DashboardColumnProps) {
  const { setNodeRef } = useDroppable({
    id: dashboard.id,
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex flex-col transition-all duration-500 ease-in-out",
        dashboard.minimized ? "w-12" : "w-72"
      )}
    >
      <div 
        className="flex flex-col p-2 cursor-pointer group"
        onClick={onToggleMinimize}
      >
        {!dashboard.minimized ? (
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <LayoutGrid size={16} className="opacity-70" />
              <h2 className="text-lg font-bold tracking-tight">
                {dashboard.label}
              </h2>
              <span className="text-[10px] opacity-30 ml-auto">{tasks.length}</span>
            </div>
            <div className="h-[2px] w-full bg-black/5 relative">
              <div 
                className="absolute left-0 top-0 h-full w-1/3 transition-all duration-500"
                style={{ backgroundColor: dashboard.color }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full pt-4">
            <LayoutGrid size={16} style={{ color: dashboard.color }} />
            <span 
              className="text-[10px] font-bold uppercase tracking-widest -rotate-90 whitespace-nowrap"
              style={{ color: dashboard.color }}
            >
              {dashboard.label}
            </span>
          </div>
        )}
      </div>

      <div className={cn(
        "flex-1 overflow-y-auto p-2",
        dashboard.minimized && "hidden"
      )}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1">
            <AnimatePresence initial={false}>
              {tasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onDelete={onDelete}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  color={dashboard.color}
                />
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
