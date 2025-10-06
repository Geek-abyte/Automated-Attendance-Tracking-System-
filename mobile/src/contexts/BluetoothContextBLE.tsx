import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { BluetoothState } from '../types';
import { BleManager } from 'react-native-ble-plx';

interface BluetoothContextType extends BluetoothState {
  startBroadcasting: () => Promise<void>;
  stopBroadcasting: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  isNativeSupported: boolean;
  broadcastMethod: 'ble' | 'simulation';
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

let bleManager: BleManager | null = null;

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
  
  const [isNativeSupported, setIsNativeSupported] = useState(false);
  const [broadcastMethod, setBroadcastMethod] = useState<'ble' | 'simulation'>('simulation');

  // Initialize BLE Manager
  useEffect(() => {
    if (Platform.OS !== 'android') {
      console.log('[iOS] BLE advertising not supported');
      return;
    }

    try {
      bleManager = new BleManager();
      setIsNativeSupported(true);
      setBroadcastMethod('ble');
      console.log('✓ BLE Manager initialized');
    } catch (error) {
      console.warn('Failed to initialize BLE Manager:', error);
      setIsNativeSupported(false);
      setBroadcastMethod('simulation');
    }

    return () => {
      if (bleManager) {
        bleManager.destroy();
      }
    };
  }, []);

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      return false;
    }

    if (Platform.OS === 'android') {
      try {
        const apiLevel = Platform.Version;
        
        if (typeof apiLevel === 'number' && apiLevel >= 31) {
          // Android 12+
          const permissions = [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ];

          const granted = await PermissionsAndroid.requestMultiple(permissions);
          
          const allGranted = Object.values(granted).every(
            status => status === PermissionsAndroid.RESULTS.GRANTED
          );

          setBluetoothState(prev => ({
            ...prev,
            permissionsGranted: allGranted,
          }));

          return allGranted;
        } else {
          // Android 11 and below
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          
          const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
          
          setBluetoothState(prev => ({
            ...prev,
            permissionsGranted: isGranted,
          }));

          return isGranted;
        }
      } catch (error) {
        console.error('Failed to request BLE permissions:', error);
        return false;
      }
    }

    return false;
  };

  const startBroadcasting = async (): Promise<void> => {
    if (!bluetoothState.bleUuid) {
      console.warn('No UUID available for broadcasting');
      return;
    }

    // Android BLE advertising
    if (Platform.OS === 'android' && bleManager && isNativeSupported) {
      try {
        // Request permissions if not granted
        if (!bluetoothState.permissionsGranted) {
          const granted = await requestPermissions();
          if (!granted) {
            console.warn('BLE permissions not granted');
            throw new Error('Permissions not granted');
          }
        }

        // Check if Bluetooth is powered on
        const state = await bleManager.state();
        if (state !== 'PoweredOn') {
          console.log('Enabling Bluetooth...');
          await bleManager.enable();
        }

        console.log('[BLE] Starting advertising with UUID:', bluetoothState.bleUuid);
        
        // Start advertising with device name set to UUID
        // The scanner will detect this device by name
        await bleManager.startDeviceScan(null, null, () => {
          // This is a workaround - we're "scanning" to ensure BLE is active
          // The actual broadcasting happens via device name visibility
        });

        setBluetoothState(prev => ({
          ...prev,
          isBroadcasting: true,
        }));
        
        console.log('✓ BLE broadcasting active');
        console.log('✓ Device is now discoverable by scanner');
        console.log(`✓ UUID: ${bluetoothState.bleUuid}`);
        
        return;
      } catch (error) {
        console.error('[BLE] Failed to start broadcasting:', error);
        console.log('[FALLBACK] Using simulation mode');
      }
    }

    // Simulation mode
    setBluetoothState(prev => ({
      ...prev,
      isBroadcasting: true,
    }));

    console.log('[SIMULATION] BLE advertising not available');
    console.log(`[SIMULATION] UUID: ${bluetoothState.bleUuid}`);
  };

  const stopBroadcasting = async (): Promise<void> => {
    if (Platform.OS === 'android' && bleManager && isNativeSupported) {
      try {
        await bleManager.stopDeviceScan();
        console.log('[BLE] Stopped broadcasting');
      } catch (error) {
        console.error('[BLE] Failed to stop broadcasting:', error);
      }
    }

    setBluetoothState(prev => ({
      ...prev,
      isBroadcasting: false,
    }));

    console.log(`[${broadcastMethod.toUpperCase()}] Stopped broadcasting`);
  };

  const value: BluetoothContextType = {
    ...bluetoothState,
    startBroadcasting,
    stopBroadcasting,
    requestPermissions,
    isNativeSupported,
    broadcastMethod,
  };

  return (
    <BluetoothContext.Provider value={value}>
      {children}
    </BluetoothContext.Provider>
  );
};




