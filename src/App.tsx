/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';
import { Task, DashboardId, DASHBOARDS, SHORTCUT_MAP, DashboardState } from './types';
import { DashboardColumn } from './components/DashboardColumn';
import { TaskItem } from './components/TaskItem';
import { StressBar } from './components/StressBar';
import { GlobalInput, GlobalInputHandle } from './components/GlobalInput';

const LOCAL_STORAGE_KEY = 'notepad_stress_tasks';
const DASHBOARD_STORAGE_KEY = 'notepad_stress_dashboards';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dashboards, setDashboards] = useState<DashboardState[]>(DASHBOARDS);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [targetDashboard, setTargetDashboard] = useState<DashboardId | null>(null);
  const inputRef = useRef<GlobalInputHandle>(null);

  // Persistence
  useEffect(() => {
    const savedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (e) {
        console.error('Failed to load tasks', e);
      }
    }

    const savedDashboards = localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (savedDashboards) {
      try {
        const parsed = JSON.parse(savedDashboards);
        // Merge with defaults to ensure all IDs exist
        setDashboards(DASHBOARDS.map(d => {
          const saved = parsed.find((p: DashboardState) => p.id === d.id);
          return saved ? { ...d, minimized: saved.minimized } : d;
        }));
      } catch (e) {
        console.error('Failed to load dashboards', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(dashboards));
  }, [dashboards]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input (except if it's our global add and they press Enter)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();
      if (SHORTCUT_MAP[key]) {
        e.preventDefault();
        setTargetDashboard(SHORTCUT_MAP[key]);
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Task Actions
  const addTask = (content: string, dashboardId: DashboardId) => {
    const newTask: Task = {
      id: uuidv4(),
      content,
      completed: false,
      dashboardId,
      createdAt: Date.now(),
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const editTask = (id: string, newContent: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, content: newContent } : t));
  };

  const toggleMinimize = (id: DashboardId) => {
    setDashboards(prev => prev.map(d => d.id === id ? { ...d, minimized: !d.minimized } : d));
  };

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveATask = tasks.some(t => t.id === activeId);
    const isOverATask = tasks.some(t => t.id === overId);
    const isOverAColumn = dashboards.some(d => d.id === overId);

    if (!isActiveATask) return;

    // Dropping over another task
    if (isOverATask) {
      setTasks(prev => {
        const activeIndex = prev.findIndex(t => t.id === activeId);
        const overIndex = prev.findIndex(t => t.id === overId);
        const activeTask = prev[activeIndex];
        const overTask = prev[overIndex];

        if (activeTask.dashboardId !== overTask.dashboardId) {
          activeTask.dashboardId = overTask.dashboardId;
          return arrayMove(prev, activeIndex, overIndex);
        }

        return arrayMove(prev, activeIndex, overIndex);
      });
    }

    // Dropping over a column
    if (isOverAColumn) {
      setTasks(prev => {
        const activeIndex = prev.findIndex(t => t.id === activeId);
        const activeTask = prev[activeIndex];
        activeTask.dashboardId = overId as DashboardId;
        return arrayMove(prev, activeIndex, activeIndex); // Trigger re-render
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
  };

  return (
    <div className="flex h-screen w-full bg-white select-none">
      <StressBar tasks={tasks} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="px-12 pt-12 pb-4 text-center">
          <h1 className="text-5xl font-bold mb-8">Agon</h1>
          <div className="flex justify-center">
            <GlobalInput
              ref={inputRef}
              onAdd={addTask}
              targetDashboard={targetDashboard}
              setTargetDashboard={setTargetDashboard}
              dashboards={dashboards}
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 pb-8">
          <div className="flex h-full gap-6 min-w-max">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              {dashboards.map(dashboard => (
                <DashboardColumn
                  key={dashboard.id}
                  dashboard={dashboard}
                  tasks={tasks.filter(t => t.dashboardId === dashboard.id)}
                  onDelete={deleteTask}
                  onToggle={toggleTask}
                  onEdit={editTask}
                  onToggleMinimize={() => toggleMinimize(dashboard.id)}
                />
              ))}

              <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                  styles: {
                    active: {
                      opacity: '0.5',
                    },
                  },
                }),
              }}>
                {activeTask ? (
                  <TaskItem
                    task={activeTask}
                    isOverlay
                    color={dashboards.find(d => d.id === activeTask.dashboardId)?.color || '#000'}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </main>
    </div>
  );
}
