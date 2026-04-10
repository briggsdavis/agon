import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'motion/react';
import { Trash2, Edit2, Check, X, CheckCircle2, Circle } from 'lucide-react';
import { Task } from '../types';
import { cn } from '../lib/utils';

interface TaskItemProps {
  task: Task;
  onDelete?: (id: string) => void;
  onToggle?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
  isOverlay?: boolean;
  color: string;
}

export function TaskItem({
  task,
  onDelete,
  onToggle,
  onEdit,
  isOverlay,
  color,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.content);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleEdit = () => {
    if (editValue.trim() && onEdit) {
      onEdit(task.id, editValue.trim());
      setIsEditing(false);
    }
  };

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-12 w-full bg-gray-50/50 border-b border-black/5 rounded opacity-50"
      />
    );
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={cn(
        "group relative flex items-center gap-3 p-2 bg-white transition-all cursor-grab active:cursor-grabbing",
        task.completed && "opacity-50",
        isOverlay && "shadow-xl border border-black/10 scale-105"
      )}
      {...attributes}
      {...listeners}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.(task.id);
        }}
        className={cn(
          "transition-all shrink-0 flex items-center justify-center",
          task.completed ? "text-black" : "text-black/20 hover:text-black/40"
        )}
      >
        {task.completed ? (
          <CheckCircle2 size={18} fill="currentColor" className="text-black" />
        ) : (
          <Circle size={18} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEdit();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="w-full bg-gray-50 px-1 border-b border-black"
            />
          </div>
        ) : (
          <p className={cn(
            "text-base break-words transition-all border-b border-black/10 pb-0.5 inline-block",
            task.completed && "line-through opacity-50"
          )}>
            {task.content}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setIsEditing(true)}
          className="p-1 hover:bg-gray-100 rounded text-black/40 hover:text-black"
        >
          <Edit2 size={12} />
        </button>
        <button
          onClick={() => onDelete?.(task.id)}
          className="p-1 hover:bg-red-50 rounded text-black/40 hover:text-red-600"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  );
}
