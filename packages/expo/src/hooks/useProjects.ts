import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  Project,
  CreateProjectRequest,
  ApiResponse,
} from '@mockd/shared/types';
import { api } from '../api/client';

const PROJECTS_KEY = ['projects'];

interface ProjectsResponse {
  data: Project[];
}

interface ProjectResponse {
  data: Project;
}

/**
 * React Query hook for project operations.
 * Provides caching, background refresh, and optimistic updates.
 */
export function useProjects() {
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: async () => {
      const response = await api.get<ProjectsResponse>('/api/projects');
      return response.data;
    },
  });

  return {
    projects: projectsQuery.data ?? [],
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error,
    refetch: projectsQuery.refetch,
  };
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await api.get<ProjectResponse>(`/api/projects/${projectId}`);
      return response.data;
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProjectRequest) => {
      const response = await api.post<ProjectResponse>('/api/projects', data);
      return response.data;
    },
    onSuccess: (newProject) => {
      queryClient.setQueryData<Project[]>(PROJECTS_KEY, (old) => {
        return old ? [...old, newProject] : [newProject];
      });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      data,
    }: {
      projectId: string;
      data: { name?: string };
    }) => {
      const response = await api.put<ProjectResponse>(
        `/api/projects/${projectId}`,
        data
      );
      return response.data;
    },
    onMutate: async ({ projectId, data }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: PROJECTS_KEY });

      // Snapshot previous value
      const previousProjects = queryClient.getQueryData<Project[]>(PROJECTS_KEY);

      // Optimistic update
      queryClient.setQueryData<Project[]>(PROJECTS_KEY, (old) => {
        return old?.map((p) =>
          p.id === projectId ? { ...p, ...data } : p
        );
      });

      return { previousProjects };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousProjects) {
        queryClient.setQueryData(PROJECTS_KEY, context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      await api.delete(`/api/projects/${projectId}`);
    },
    onMutate: async (projectId) => {
      await queryClient.cancelQueries({ queryKey: PROJECTS_KEY });

      const previousProjects = queryClient.getQueryData<Project[]>(PROJECTS_KEY);

      queryClient.setQueryData<Project[]>(PROJECTS_KEY, (old) => {
        return old?.filter((p) => p.id !== projectId);
      });

      return { previousProjects };
    },
    onError: (_err, _projectId, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(PROJECTS_KEY, context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}
