import dayjs from 'dayjs';
import { supabase } from './supabase';
import { Job, User } from '../types';
import { DEMO_MODE, mockJobs, mockTechnicians } from './mockData';

interface FetchOpts {
  userId: string;
  isDispatcher: boolean;
  rangeStart: string;
  rangeEnd: string;
}

export async function fetchJobs({ userId, isDispatcher, rangeStart, rangeEnd }: FetchOpts): Promise<Job[]> {
  if (DEMO_MODE) {
    return mockJobs
      .filter(j => {
        const t = dayjs(j.scheduled_start);
        const inRange = t.isAfter(dayjs(rangeStart).subtract(1, 'second')) && t.isBefore(dayjs(rangeEnd).add(1, 'second'));
        const visible = isDispatcher || j.assigned_to === userId;
        return inRange && visible;
      })
      .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start));
  }

  let query = supabase
    .from('jobs')
    .select('*, technician:profiles!jobs_assigned_to_fkey(*)')
    .gte('scheduled_start', rangeStart)
    .lte('scheduled_start', rangeEnd)
    .order('scheduled_start');

  if (!isDispatcher) query = query.eq('assigned_to', userId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Job[];
}

export async function fetchTechnicians(): Promise<User[]> {
  if (DEMO_MODE) return mockTechnicians;

  const { data, error } = await supabase.from('profiles').select('*').eq('role', 'technician');
  if (error) throw error;
  return (data || []) as User[];
}

export type JobInput = Omit<Job, 'id' | 'technician' | 'created_at'>;

export async function saveJob(input: JobInput, existingId?: string): Promise<Job> {
  if (DEMO_MODE) {
    const technician = mockTechnicians.find(t => t.id === input.assigned_to);
    if (existingId) {
      const idx = mockJobs.findIndex(j => j.id === existingId);
      const updated: Job = { ...mockJobs[idx], ...input, technician };
      mockJobs[idx] = updated;
      return updated;
    }
    const created: Job = {
      ...input,
      id: 'j' + (Date.now()),
      technician,
      created_at: new Date().toISOString(),
    };
    mockJobs.push(created);
    return created;
  }

  if (existingId) {
    const { data, error } = await supabase.from('jobs').update(input).eq('id', existingId).select().single();
    if (error) throw error;
    return data as Job;
  }
  const { data, error } = await supabase.from('jobs').insert(input).select().single();
  if (error) throw error;
  return data as Job;
}

export async function updateJobStatus(id: string, status: Job['status']): Promise<void> {
  if (DEMO_MODE) {
    const job = mockJobs.find(j => j.id === id);
    if (job) job.status = status;
    return;
  }
  const { error } = await supabase.from('jobs').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteJob(id: string): Promise<void> {
  if (DEMO_MODE) {
    const idx = mockJobs.findIndex(j => j.id === id);
    if (idx >= 0) mockJobs.splice(idx, 1);
    return;
  }
  const { error } = await supabase.from('jobs').delete().eq('id', id);
  if (error) throw error;
}
