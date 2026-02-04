import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  FAB,
  Card,
  Text,
  useTheme,
  IconButton,
  Portal,
  Dialog,
  TextInput,
  Button,
  Menu,
} from 'react-native-paper';
import type { Project } from '@mockd/shared/types';
import { useProjects, useCreateProject, useDeleteProject } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';

export default function ProjectsScreen() {
  const theme = useTheme();
  const { logout } = useAuth();
  const { projects, isLoading, error, refetch } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [refreshing, setRefreshing] = useState(false);
  const [createDialogVisible, setCreateDialogVisible] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectSubdomain, setNewProjectSubdomain] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !newProjectSubdomain.trim()) return;

    try {
      await createProject.mutateAsync({
        name: newProjectName.trim(),
        subdomain: newProjectSubdomain.trim().toLowerCase(),
      });
      setCreateDialogVisible(false);
      setNewProjectName('');
      setNewProjectSubdomain('');
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject.mutateAsync(projectId);
    } catch (err) {
      // Error handled by mutation
    }
  };

  const renderProject = ({ item }: { item: Project }) => (
    <Card
      style={styles.card}
      mode="outlined"
      onPress={() => router.push(`/(app)/projects/${item.id}`)}
    >
      <Card.Title
        title={item.name}
        subtitle={`${item.subdomain}.mockd.dev`}
        right={(props) => (
          <Menu
            visible={selectedProjectId === item.id}
            onDismiss={() => setSelectedProjectId(null)}
            anchor={
              <IconButton
                {...props}
                icon="dots-vertical"
                onPress={() => setSelectedProjectId(item.id)}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setSelectedProjectId(null);
                handleDeleteProject(item.id);
              }}
              title="Delete"
              leadingIcon="delete"
            />
          </Menu>
        )}
      />
    </Card>
  );

  if (isLoading && projects.length === 0) {
    return <LoadingState message="Loading projects..." />;
  }

  if (error && projects.length === 0) {
    return (
      <ErrorState
        message="Failed to load projects"
        onRetry={refetch}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  onPress={() => setMenuVisible(true)}
                />
              }
            >
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  logout();
                }}
                title="Sign Out"
                leadingIcon="logout"
              />
            </Menu>
          ),
        }}
      />

      {projects.length === 0 ? (
        <EmptyState
          icon="folder-plus-outline"
          title="No projects yet"
          description="Create your first mock API project to get started"
          actionLabel="Create Project"
          onAction={() => setCreateDialogVisible(true)}
        />
      ) : (
        <FlatList
          data={projects}
          renderItem={renderProject}
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
          <Dialog.Title>Create Project</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Project Name"
              value={newProjectName}
              onChangeText={setNewProjectName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Subdomain"
              value={newProjectSubdomain}
              onChangeText={setNewProjectSubdomain}
              mode="outlined"
              autoCapitalize="none"
              style={styles.input}
            />
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Your endpoints will be available at {newProjectSubdomain || 'subdomain'}.mockd.dev
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateDialogVisible(false)}>Cancel</Button>
            <Button
              onPress={handleCreateProject}
              loading={createProject.isPending}
              disabled={!newProjectName.trim() || !newProjectSubdomain.trim()}
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
