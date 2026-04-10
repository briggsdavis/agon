import { motion } from 'motion/react';
import { Task } from '../types';
import { cn } from '../lib/utils';

interface StressBarProps {
  tasks: Task[];
}

export function StressBar({ tasks }: StressBarProps) {
  const incompleteTasks = tasks.filter(t => !t.completed);
  
  // Weighting logic
  const getWeightedCount = () => {
    return incompleteTasks.reduce((acc, task) => {
      const weight = (task.dashboardId === 'Esade' || task.dashboardId === 'Ennova') ? 2 : 1;
      return acc + weight;
    }, 0);
  };

  const weightedTotal = getWeightedCount();
  
  // Threshold logic: If any dashboard > 10 incomplete tasks, it's urgent.
  const dashboardCounts = incompleteTasks.reduce((acc, task) => {
    acc[task.dashboardId] = (acc[task.dashboardId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const isUrgent = Object.values(dashboardCounts).some(count => count >= 10);
  
  // Fill percentage: Let's say 30 weighted tasks is "full" for the total bar, 
  // but if it's urgent, we force it to at least 90%.
  const basePercentage = Math.min(100, (weightedTotal / 30) * 100);
  const fillPercentage = isUrgent ? Math.max(90, basePercentage) : basePercentage;

  // Color logic
  const getBarColor = () => {
    if (isUrgent) return '#DC2626'; // Urgent Red
    if (fillPercentage > 60) return '#F97316'; // Orange
    if (fillPercentage > 30) return '#FBBF24'; // Yellow
    return '#E5E5E5'; // Neutral/Faint
  };

  return (
    <div className="w-16 h-full border-r border-black/5 flex flex-col items-center py-12 relative group bg-gray-50/30">
      <div className="flex-1 w-[2px] bg-black/5 rounded-full overflow-hidden relative">
        <motion.div
          className="absolute bottom-0 left-0 w-full"
          initial={{ height: 0 }}
          animate={{ 
            height: `${fillPercentage}%`,
            backgroundColor: getBarColor()
          }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        />
      </div>

      {isUrgent && (
        <motion.div
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mt-6 text-[8px] text-red-600 font-bold uppercase tracking-widest"
        >
          Critical
        </motion.div>
      )}
    </div>
  );
}
