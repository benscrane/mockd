import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import {
  FAB,
  Card,
  Text,
  Chip,
  useTheme,
  IconButton,
  Portal,
  Dialog,
  TextInput,
  Button,
  Menu,
} from 'react-native-paper';
import type { Endpoint } from '@mockd/shared/types';
import { useProject } from '@/hooks/useProjects';
import {
  useEndpoints,
  useCreateEndpoint,
  useDeleteEndpoint,
} from '@/hooks/useEndpoints';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';

export default function ProjectDetailScreen() {
  const theme = useTheme();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { endpoints, isLoading: endpointsLoading, refetch } = useEndpoints(projectId);
  const createEndpoint = useCreateEndpoint(projectId);
  const deleteEndpoint = useDeleteEndpoint(projectId);

  const [refreshing, setRefreshing] = useState(false);
  const [createDialogVisible, setCreateDialogVisible] = useState(false);
  const [newEndpointPath, setNewEndpointPath] = useState('');
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);

  const isLoading = projectLoading || endpointsLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCreateEndpoint = async () => {
    if (!newEndpointPath.trim()) return;

    const path = newEndpointPath.startsWith('/')
      ? newEndpointPath.trim()
      : `/${newEndpointPath.trim()}`;

    try {
      await createEndpoint.mutateAsync({
        path,
        responseBody: JSON.stringify({ message: 'Hello from mockd!' }, null, 2),
        statusCode: 200,
        delay: 0,
        rateLimit: 0,
      });
      setCreateDialogVisible(false);
      setNewEndpointPath('');
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleDeleteEndpoint = async (endpointId: string) => {
    try {
      await deleteEndpoint.mutateAsync(endpointId);
    } catch (err) {
      // Error handled by mutation
    }
  };

  const getStatusCodeColor = (code: number) => {
    if (code >= 200 && code < 300) return theme.colors.primary;
    if (code >= 300 && code < 400) return '#F59E0B'; // warning
    if (code >= 400) return theme.colors.error;
    return theme.colors.onSurfaceVariant;
  };

  const renderEndpoint = ({ item }: { item: Endpoint }) => (
    <Card
      style={styles.card}
      mode="outlined"
      onPress={() =>
        router.push(`/(app)/projects/${projectId}/endpoints/${item.id}`)
      }
    >
      <Card.Title
        title={item.path}
        subtitle={`Delay: ${item.delay}ms`}
        left={() => (
          <Chip
            compact
            mode="flat"
            style={{ backgroundColor: getStatusCodeColor(item.statusCode) + '20' }}
            textStyle={{ color: getStatusCodeColor(item.statusCode) }}
          >
            {item.statusCode}
          </Chip>
        )}
        right={(props) => (
          <Menu
            visible={selectedEndpointId === item.id}
            onDismiss={() => setSelectedEndpointId(null)}
            anchor={
              <IconButton
                {...props}
                icon="dots-vertical"
                onPress={() => setSelectedEndpointId(item.id)}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setSelectedEndpointId(null);
                handleDeleteEndpoint(item.id);
              }}
              title="Delete"
              leadingIcon="delete"
            />
          </Menu>
        )}
      />
    </Card>
  );

  if (isLoading && endpoints.length === 0) {
    return <LoadingState message="Loading endpoints..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          title: project?.name || 'Project',
        }}
      />

      {project && (
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {project.subdomain}.mockd.dev
          </Text>
        </View>
      )}

      {endpoints.length === 0 ? (
        <EmptyState
          icon="api"
          title="No endpoints yet"
          description="Create your first mock endpoint to start receiving requests"
          actionLabel="Create Endpoint"
          onAction={() => setCreateDialogVisible(true)}
        />
      ) : (
        <FlatList
          data={endpoints}
          renderItem={renderEndpoint}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => setCreateDialogVisible(true)}
      />

      <Portal>
        <Dialog
          visible={createDialogVisible}
          onDismiss={() => setCreateDialogVisible(false)}
        >
          <Dialog.Title>Create Endpoint</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Path"
              value={newEndpointPath}
              onChangeText={setNewEndpointPath}
              mode="outlined"
              autoCapitalize="none"
              placeholder="/api/users"
              style={styles.input}
            />
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              The endpoint path (e.g., /api/users). You can configure the
              response after creation.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateDialogVisible(false)}>Cancel</Button>
            <Button
              onPress={handleCreateEndpoint}
              loading={createEndpoint.isPending}
              disabled={!newEndpointPath.trim()}
            >
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  input: {
    marginBottom: 12,
  },
});
