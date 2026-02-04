import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  Endpoint,
  CreateEndpointRequest,
  UpdateEndpointRequest,
} from '@mockd/shared/types';
import { api } from '../api/client';

interface EndpointsResponse {
  data: Endpoint[];
}

interface EndpointResponse {
  data: Endpoint;
}

/**
 * React Query hook for endpoint operations.
 */
export function useEndpoints(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['endpoints', projectId];

  const endpointsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.get<EndpointsResponse>(
        `/api/projects/${projectId}/endpoints`
      );
      return response.data;
    },
    enabled: !!projectId,
  });

  return {
    endpoints: endpointsQuery.data ?? [],
    isLoading: endpointsQuery.isLoading,
    error: endpointsQuery.error,
    refetch: endpointsQuery.refetch,
  };
}

export function useEndpoint(projectId: string, endpointId: string) {
  return useQuery({
    queryKey: ['endpoint', projectId, endpointId],
    queryFn: async () => {
      const response = await api.get<EndpointResponse>(
        `/api/projects/${projectId}/endpoints/${endpointId}`
      );
      return response.data;
    },
    enabled: !!projectId && !!endpointId,
  });
}

export function useCreateEndpoint(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['endpoints', projectId];

  return useMutation({
    mutationFn: async (data: CreateEndpointRequest) => {
      const response = await api.post<EndpointResponse>(
        `/api/projects/${projectId}/endpoints`,
        data
      );
      return response.data;
    },
    onSuccess: (newEndpoint) => {
      queryClient.setQueryData<Endpoint[]>(queryKey, (old) => {
        return old ? [...old, newEndpoint] : [newEndpoint];
      });
    },
  });
}

export function useUpdateEndpoint(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['endpoints', projectId];

  return useMutation({
    mutationFn: async ({
      endpointId,
      data,
    }: {
      endpointId: string;
      data: UpdateEndpointRequest;
    }) => {
      const response = await api.put<EndpointResponse>(
        `/api/projects/${projectId}/endpoints/${endpointId}`,
        data
      );
      return response.data;
    },
    onMutate: async ({ endpointId, data }) => {
      await queryClient.cancelQueries({ queryKey });

      const previousEndpoints = queryClient.getQueryData<Endpoint[]>(queryKey);

      queryClient.setQueryData<Endpoint[]>(queryKey, (old) => {
        return old?.map((e) =>
          e.id === endpointId ? { ...e, ...data } : e
        );
      });

      return { previousEndpoints };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousEndpoints) {
        queryClient.setQueryData(queryKey, context.previousEndpoints);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useDeleteEndpoint(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['endpoints', projectId];

  return useMutation({
    mutationFn: async (endpointId: string) => {
      await api.delete(`/api/projects/${projectId}/endpoints/${endpointId}`);
    },
    onMutate: async (endpointId) => {
      await queryClient.cancelQueries({ queryKey });

      const previousEndpoints = queryClient.getQueryData<Endpoint[]>(queryKey);

      queryClient.setQueryData<Endpoint[]>(queryKey, (old) => {
        return old?.filter((e) => e.id !== endpointId);
      });

      return { previousEndpoints };
    },
    onError: (_err, _endpointId, context) => {
      if (context?.previousEndpoints) {
        queryClient.setQueryData(queryKey, context.previousEndpoints);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
