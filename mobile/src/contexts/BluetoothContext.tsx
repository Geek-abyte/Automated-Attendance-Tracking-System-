import React, { createContext, useContext, useEffect, useState } from 'react';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { BluetoothState } from '../types';

// Conditionally import BLE library
let BleManager: any = null;
let State: any = null;

try {
  const bleModule = require('react-native-ble-plx');
  BleManager = bleModule.BleManager;
  State = bleModule.State;
} catch (error) {
  console.warn('BLE library not available:', error);
}

interface BluetoothContextType extends BluetoothState {
  startBroadcasting: () => Promise<void>;
  stopBroadcasting: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
}

const BluetoothContext = createContext<BluetoothContextType | undefined>(undefined);

export const useBluetooth = () => {
  const context = useContext(BluetoothContext);
  if (!context) {
    throw new Error('useBluetooth must be used within a BluetoothProvider');
  }
  return context;
};

interface BluetoothProviderProps {
  children: React.ReactNode;
  bleUuid: string | null;
}

export const BluetoothProvider: React.FC<BluetoothProviderProps> = ({ 
  children, 
  bleUuid 
}) => {
  const [bluetoothState, setBluetoothState] = useState<BluetoothState>({
    isScanning: false,
    isBroadcasting: false,
    bleUuid: bleUuid,
    permissionsGranted: false,
  });

  const [bleManager] = useState(() => {
    if (BleManager) {
      try {
        return new BleManager();
      } catch (error) {
        console.warn('Failed to create BleManager:', error);
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    // Check initial Bluetooth state
    checkBluetoothState();
    
    // Cleanup on unmount
    return () => {
      if (bleManager) {
        bleManager.destroy();
      }
    };
  }, []);

  useEffect(() => {
    // Update BLE UUID when it changes
    setBluetoothState(prev => ({
      ...prev,
      bleUuid,
    }));
  }, [bleUuid]);

  const checkBluetoothState = async () => {
    if (!bleManager || !State) {
      console.warn('BLE not available, using simulation mode');
      setBluetoothState(prev => ({
        ...prev,
        permissionsGranted: true,
      }));
      return;
    }

    try {
      const state = await bleManager.state();
      if (state === State.PoweredOn) {
        setBluetoothState(prev => ({
          ...prev,
          permissionsGranted: true,
        }));
      }
    } catch (error) {
      console.error('Error checking Bluetooth state:', error);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );

        if (allGranted) {
          setBluetoothState(prev => ({
            ...prev,
            permissionsGranted: true,
          }));
          return true;
        } else {
          Alert.alert(
            'Permissions Required',
            'Bluetooth permissions are required for attendance tracking. Please enable them in settings.',
            [{ text: 'OK' }]
          );
          return false;
        }
      } else {
        // iOS permissions are handled automatically
        setBluetoothState(prev => ({
          ...prev,
          permissionsGranted: true,
        }));
        return true;
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  const startBroadcasting = async (): Promise<void> => {
    try {
      if (!bluetoothState.permissionsGranted) {
        const granted = await requestPermissions();
        if (!granted) return;
      }

      if (!bluetoothState.bleUuid) {
        Alert.alert('Error', 'No BLE UUID available for broadcasting');
        return;
      }

      // For MVP, we'll simulate broadcasting
      // In production, this would use actual BLE advertising
      setBluetoothState(prev => ({
        ...prev,
        isBroadcasting: true,
      }));

      console.log(`Started broadcasting BLE UUID: ${bluetoothState.bleUuid}`);
      
      // Show a notification that we're in simulation mode
      if (!bleManager) {
        console.log('BLE simulation mode - broadcasting would start here');
      }
    } catch (error) {
      console.error('Error starting broadcasting:', error);
      Alert.alert('Error', 'Failed to start broadcasting');
    }
  };

  const stopBroadcasting = async (): Promise<void> => {
    try {
      setBluetoothState(prev => ({
        ...prev,
        isBroadcasting: false,
      }));

      console.log('Stopped broadcasting BLE UUID');
    } catch (error) {
      console.error('Error stopping broadcasting:', error);
    }
  };

  const value: BluetoothContextType = {
    ...bluetoothState,
    startBroadcasting,
    stopBroadcasting,
    requestPermissions,
  };

  return (
    <BluetoothContext.Provider value={value}>
      {children}
    </BluetoothContext.Provider>
  );
};
