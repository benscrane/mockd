import { useState, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Card,
  Chip,
  SegmentedButtons,
  Portal,
  Modal,
  IconButton,
  Divider,
} from 'react-native-paper';
import type { RequestLog } from '@mockd/shared/types';
import { useProject } from '@/hooks/useProjects';
import { useEndpoint, useUpdateEndpoint } from '@/hooks/useEndpoints';
import { useWebSocket, ConnectionStatus } from '@/hooks/useWebSocket';
import { LoadingState } from '@/components/common/LoadingState';

type TabValue = 'config' | 'logs';

export default function EndpointDetailScreen() {
  const theme = useTheme();
  const { projectId, endpointId } = useLocalSearchParams<{
    projectId: string;
    endpointId: string;
  }>();

  const { data: project } = useProject(projectId);
  const { data: endpoint, isLoading } = useEndpoint(projectId, endpointId);
  const updateEndpoint = useUpdateEndpoint(projectId);

  const { status, requests, clearRequests } = useWebSocket({
    subdomain: project?.subdomain,
    endpointId,
    projectId,
  });

  const [activeTab, setActiveTab] = useState<TabValue>('logs');
  const [responseBody, setResponseBody] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const [delay, setDelay] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<RequestLog | null>(null);

  // Initialize form when endpoint loads
  useEffect(() => {
    if (endpoint) {
      setResponseBody(endpoint.responseBody);
      setStatusCode(String(endpoint.statusCode));
      setDelay(String(endpoint.delay));
    }
  }, [endpoint]);

  const handleSave = async () => {
    try {
      await updateEndpoint.mutateAsync({
        endpointId,
        data: {
          responseBody,
          statusCode: parseInt(statusCode, 10) || 200,
          delay: parseInt(delay, 10) || 0,
        },
      });
    } catch (err) {
      // Error handled by mutation
    }
  };

  const getStatusIndicatorColor = (connectionStatus: ConnectionStatus) => {
    switch (connectionStatus) {
      case 'connected':
        return '#22C55E';
      case 'connecting':
        return '#F59E0B';
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: '#22C55E',
      POST: '#3B82F6',
      PUT: '#F59E0B',
      PATCH: '#8B5CF6',
      DELETE: '#EF4444',
    };
    return colors[method] || theme.colors.onSurfaceVariant;
  };

  const renderRequest = ({ item }: { item: RequestLog }) => (
    <Card
      style={styles.requestCard}
      mode="outlined"
      onPress={() => setSelectedRequest(item)}
    >
      <Card.Content style={styles.requestContent}>
        <View style={styles.requestHeader}>
          <Chip
            compact
            mode="flat"
            style={{ backgroundColor: getMethodColor(item.method) + '20' }}
            textStyle={{ color: getMethodColor(item.method), fontSize: 12 }}
          >
            {item.method}
          </Chip>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
        <Text variant="bodyMedium" numberOfLines={1}>
          {item.path}
        </Text>
      </Card.Content>
    </Card>
  );

  if (isLoading) {
    return <LoadingState message="Loading endpoint..." />;
  }

  if (!endpoint) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          title: endpoint.path,
          headerRight: () => (
            <View style={styles.statusIndicator}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusIndicatorColor(status) },
                ]}
              />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {status === 'connected' ? 'Live' : status}
              </Text>
            </View>
          ),
        }}
      />

      <SegmentedButtons
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
        buttons={[
          { value: 'logs', label: 'Live Logs' },
          { value: 'config', label: 'Configuration' },
        ]}
        style={styles.tabs}
      />

      {activeTab === 'config' ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.configContainer}
        >
          <ScrollView contentContainerStyle={styles.configContent}>
            <TextInput
              label="Status Code"
              value={statusCode}
              onChangeText={setStatusCode}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Delay (ms)"
              value={delay}
              onChangeText={setDelay}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Response Body (JSON)"
              value={responseBody}
              onChangeText={setResponseBody}
              mode="outlined"
              multiline
              numberOfLines={10}
              style={[styles.input, styles.responseInput]}
            />
            <Button
              mode="contained"
              onPress={handleSave}
              loading={updateEndpoint.isPending}
              style={styles.saveButton}
            >
              Save Changes
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.logsContainer}>
          <View style={styles.logsHeader}>
            <Text variant="titleSmall">
              {requests.length} request{requests.length !== 1 ? 's' : ''}
            </Text>
            <Button
              mode="text"
              compact
              onPress={clearRequests}
              disabled={requests.length === 0}
            >
              Clear
            </Button>
          </View>
          {requests.length === 0 ? (
            <View style={styles.emptyLogs}>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
              >
                No requests yet.{'\n'}Send a request to {project?.subdomain}.mockd.dev
                {endpoint.path}
              </Text>
            </View>
          ) : (
            <FlatList
              data={requests}
              renderItem={renderRequest}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.logsList}
            />
          )}
        </View>
      )}

      <Portal>
        <Modal
          visible={!!selectedRequest}
          onDismiss={() => setSelectedRequest(null)}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          {selectedRequest && (
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text variant="titleMedium">Request Details</Text>
                <IconButton
                  icon="close"
                  onPress={() => setSelectedRequest(null)}
                />
              </View>
              <Divider />
              <View style={styles.modalContent}>
                <Text variant="labelMedium" style={styles.modalLabel}>
                  Method
                </Text>
                <Text variant="bodyMedium">{selectedRequest.method}</Text>

                <Text variant="labelMedium" style={styles.modalLabel}>
                  Path
                </Text>
                <Text variant="bodyMedium">{selectedRequest.path}</Text>

                <Text variant="labelMedium" style={styles.modalLabel}>
                  Timestamp
                </Text>
                <Text variant="bodyMedium">
                  {new Date(selectedRequest.timestamp).toLocaleString()}
                </Text>

                {selectedRequest.headers && (
                  <>
                    <Text variant="labelMedium" style={styles.modalLabel}>
                      Headers
                    </Text>
                    <Card mode="outlined" style={styles.codeCard}>
                      <Card.Content>
                        <Text variant="bodySmall" style={styles.code}>
                          {JSON.stringify(selectedRequest.headers, null, 2)}
                        </Text>
                      </Card.Content>
                    </Card>
                  </>
                )}

                {selectedRequest.body && (
                  <>
                    <Text variant="labelMedium" style={styles.modalLabel}>
                      Body
                    </Text>
                    <Card mode="outlined" style={styles.codeCard}>
                      <Card.Content>
                        <Text variant="bodySmall" style={styles.code}>
                          {typeof selectedRequest.body === 'string'
                            ? selectedRequest.body
                            : JSON.stringify(selectedRequest.body, null, 2)}
                        </Text>
                      </Card.Content>
                    </Card>
                  </>
                )}
              </View>
            </ScrollView>
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    margin: 16,
  },
  configContainer: {
    flex: 1,
  },
  configContent: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  responseInput: {
    minHeight: 200,
  },
  saveButton: {
    marginTop: 8,
  },
  logsContainer: {
    flex: 1,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logsList: {
    padding: 16,
    paddingTop: 0,
  },
  emptyLogs: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  requestCard: {
    marginBottom: 8,
  },
  requestContent: {
    gap: 8,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modal: {
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 16,
  },
  modalContent: {
    padding: 16,
  },
  modalLabel: {
    marginTop: 16,
    marginBottom: 4,
    opacity: 0.7,
  },
  codeCard: {
    marginTop: 8,
  },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
