import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Event, EventRegistration } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useBluetooth } from '../contexts/BluetoothContextFallback';
import { ApiService } from '../services/api';

interface EventsScreenProps {
  onNavigateToProfile: () => void;
}

export const EventsScreen: React.FC<EventsScreenProps> = ({ onNavigateToProfile }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringEvents, setRegisteringEvents] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { isBroadcasting, startBroadcasting, stopBroadcasting } = useBluetooth();

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsData, registrationsData] = await Promise.all([
        ApiService.getEvents(),
        user ? ApiService.getUserRegistrations(user._id) : Promise.resolve([])
      ]);
      setEvents(eventsData);
      setRegistrations(registrationsData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRegister = async (eventId: string) => {
    if (!user) return;

    setRegisteringEvents(prev => new Set(prev).add(eventId));
    try {
      await ApiService.registerForEvent(user._id, eventId);
      await loadData(); // Refresh data
      Alert.alert('Success', 'Successfully registered for event');
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to register for event';
      Alert.alert('Error', errorMessage);
    } finally {
      setRegisteringEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
    }
  };

  const handleUnregister = async (eventId: string) => {
    if (!user) return;

    Alert.alert(
      'Confirm Unregistration',
      'Are you sure you want to unregister from this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unregister',
          style: 'destructive',
          onPress: async () => {
            setRegisteringEvents(prev => new Set(prev).add(eventId));
            try {
              await ApiService.unregisterFromEvent(user._id, eventId);
              await loadData(); // Refresh data
              Alert.alert('Success', 'Successfully unregistered from event');
            } catch (error) {
              console.error('Unregistration error:', error);
              const errorMessage = error instanceof Error ? error.message : 'Failed to unregister from event';
              Alert.alert('Error', errorMessage);
            } finally {
              setRegisteringEvents(prev => {
                const newSet = new Set(prev);
                newSet.delete(eventId);
                return newSet;
              });
            }
          }
        }
      ]
    );
  };

  const handleRecordAttendance = async (eventId: string) => {
    if (!user) return;

    try {
      await ApiService.recordAttendance(user._id, eventId, 'mobile');
      Alert.alert('Success', 'Attendance recorded successfully');
    } catch (error) {
      console.error('Attendance recording error:', error);
      Alert.alert('Error', 'Failed to record attendance');
    }
  };

  const handleToggleBroadcasting = async () => {
    if (isBroadcasting) {
      await stopBroadcasting();
    } else {
      await startBroadcasting();
    }
  };

  const isRegisteredForEvent = (eventId: string): boolean => {
    return registrations.some(reg => reg.eventId === eventId && reg.status === 'registered');
  };

  const isEventActive = (event: Event): boolean => {
    const now = Date.now();
    if (!event.startTime || !event.endTime) {
      return event.isActive;
    }
    return now >= event.startTime && now <= event.endTime;
  };

  const getEventStatus = (event: Event): string => {
    if (event.isActive) {
      return 'Active';
    }
    
    const now = Date.now();
    if (event.startTime && now < event.startTime) {
      return 'Upcoming';
    } else if (event.endTime && now > event.endTime) {
      return 'Ended';
    } else {
      return 'Inactive';
    }
  };

  const getEventStatusColor = (event: Event): string => {
    const status = getEventStatus(event);
    switch (status) {
      case 'Active':
        return '#4CAF50';
      case 'Upcoming':
        return '#FF9800';
      case 'Ended':
        return '#9E9E9E';
      case 'Inactive':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const renderEvent = ({ item: event }: { item: Event }) => {
    const isRegistered = isRegisteredForEvent(event._id);
    const isActive = isEventActive(event);
    const status = getEventStatus(event);
    const statusColor = getEventStatusColor(event);

    return (
      <View style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventName}>{event.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>

        {event.description && (
          <Text style={styles.eventDescription}>{event.description}</Text>
        )}

        <Text style={styles.eventTime}>
          {event.startTime ? new Date(event.startTime).toLocaleString() : 'No start time'} - {event.endTime ? new Date(event.endTime).toLocaleString() : 'No end time'}
        </Text>

        <View style={styles.eventActions}>
          {isRegistered ? (
            <TouchableOpacity
              style={[
                styles.button, 
                styles.unregisterButton,
                registeringEvents.has(event._id) && styles.disabledButton
              ]}
              onPress={() => handleUnregister(event._id)}
              disabled={registeringEvents.has(event._id)}
            >
              <Text style={styles.unregisterButtonText}>
                {registeringEvents.has(event._id) ? 'Unregistering...' : 'Unregister'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.button, 
                styles.registerButton,
                registeringEvents.has(event._id) && styles.disabledButton
              ]}
              onPress={() => handleRegister(event._id)}
              disabled={registeringEvents.has(event._id)}
            >
              <Text style={styles.registerButtonText}>
                {registeringEvents.has(event._id) ? 'Registering...' : 'Register'}
              </Text>
            </TouchableOpacity>
          )}

          {isRegistered && isActive && (
            <TouchableOpacity
              style={[
                styles.button,
                isBroadcasting ? styles.broadcastingButton : styles.broadcastButton
              ]}
              onPress={handleToggleBroadcasting}
            >
              <Text style={styles.broadcastButtonText}>
                {isBroadcasting ? 'Stop Broadcasting' : 'Start Broadcasting'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Events</Text>
        <TouchableOpacity onPress={onNavigateToProfile}>
          <Text style={styles.profileButton}>Profile</Text>
        </TouchableOpacity>
      </View>

      {isBroadcasting && (
        <View style={styles.broadcastingBanner}>
          <Text style={styles.broadcastingText}>
            🔵 Broadcasting attendance for active events
          </Text>
        </View>
      )}

      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.eventsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No events available</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  profileButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  broadcastingBanner: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    alignItems: 'center',
  },
  broadcastingText: {
    color: '#1976D2',
    fontWeight: '500',
  },
  eventsList: {
    padding: 16,
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  eventTime: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  registerButton: {
    backgroundColor: '#007AFF',
  },
  registerButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  unregisterButton: {
    backgroundColor: '#FF3B30',
  },
  unregisterButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  broadcastButton: {
    backgroundColor: '#4CAF50',
  },
  broadcastingButton: {
    backgroundColor: '#FF9800',
  },
  broadcastButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
