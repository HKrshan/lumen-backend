import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startResearch, getTaskStatus, listTasks } from './client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ── List all tasks ────────────────────────────── */
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: listTasks,
    refetchInterval: 5000,
  });
}

/* ── Poll status for a single task ─────────────── */
export function useTaskStatus(taskId) {
  return useQuery({
    queryKey: ['task-status', taskId],
    queryFn: () => getTaskStatus(taskId),
    enabled: !!taskId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'done' || status === 'failed') return false;
      return 2000;
    },
  });
}

/* ── Start a new research task ─────────────────── */
export function useStartResearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startResearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useTaskDetails(taskId) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) return null;
      const res = await fetch(`${API_URL}/status/${taskId}`);
      if (!res.ok) throw new Error('Failed to fetch task');
      return res.json();
    },
    enabled: !!taskId,
    refetchInterval: (data) => {
      if (data?.status === 'done' || data?.status === 'failed') return false;
      return 2000;
    },
  });
}
