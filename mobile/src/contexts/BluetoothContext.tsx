import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { BluetoothState } from '../types';
import BleAdvertiser from 'react-native-ble-advertiser';

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

  // Check if native BLE Advertising is supported
  useEffect(() => {
    const checkSupport = async () => {
      // iOS doesn't support BLE advertising with custom UUIDs
      if (Platform.OS === 'ios') {
        setIsNativeSupported(false);
        setBroadcastMethod('simulation');
        console.log('[iOS] BLE advertising not supported, using simulation mode');
        return;
      }

      // Android: Assume BLE advertising is supported
      // We'll check for errors when actually trying to broadcast
      try {
        // Initialize BLE Advertiser
        BleAdvertiser.setCompanyId(0x0000); // Use standard company ID
        setIsNativeSupported(true);
        setBroadcastMethod('ble');
        console.log('[BLE Advertiser] Module loaded ✓');
      } catch (error) {
        console.warn('[BLE Advertiser] Module not available:', error);
        setIsNativeSupported(false);
        setBroadcastMethod('simulation');
      }
    };
    
    checkSupport();
  }, []);

  const requestPermissions = async (): Promise<boolean> => {
    // iOS doesn't support custom BLE advertising, so always return false
    if (Platform.OS === 'ios') {
      console.log('[iOS] BLE advertising not supported, using fallback mode');
      setBluetoothState(prev => ({
        ...prev,
        permissionsGranted: false,
      }));
      return false;
    }

    // Android 12+ requires BLUETOOTH_ADVERTISE permission
    if (Platform.OS === 'android') {
      try {
        const apiLevel = Platform.Version;
        
        // Android 12 (API 31) and above
        if (typeof apiLevel === 'number' && apiLevel >= 31) {
          // Only request permissions we actually need for advertising
          const requiredPermissions = [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ];

          const granted = await PermissionsAndroid.requestMultiple(requiredPermissions);
          
          console.log('[Permissions] Result:', granted);
          
          // Check if REQUIRED permissions are granted
          const advertiseGranted = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE] === PermissionsAndroid.RESULTS.GRANTED;
          const locationGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
          
          const allRequiredGranted = advertiseGranted && locationGranted;

          console.log(`[Permissions] BLUETOOTH_ADVERTISE: ${advertiseGranted}, LOCATION: ${locationGranted}`);
          console.log(`[Permissions] All required granted: ${allRequiredGranted}`);
          
          setBluetoothState(prev => ({
            ...prev,
            permissionsGranted: allRequiredGranted,
          }));

          return allRequiredGranted;
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
      console.warn('No BLE UUID available for broadcasting');
      return;
    }

    // Try native BLE advertising on Android
    if (Platform.OS === 'android' && isNativeSupported) {
      try {
        // Request permissions if not already granted
        let hasPermissions = bluetoothState.permissionsGranted;
        if (!hasPermissions) {
          hasPermissions = await requestPermissions();
          if (!hasPermissions) {
            console.warn('[BLE Advertiser] Bluetooth permissions not granted, using simulation mode');
            // Fall through to simulation mode
          }
        }

        if (hasPermissions) {
          // Try BLE advertising
          try {
            console.log(`[BLE Advertiser] Starting advertising with UUID: ${bluetoothState.bleUuid}`);
            
            // Configure the advertiser with a custom/test company ID
            // 0xFFFF is commonly used for custom implementations
            BleAdvertiser.setCompanyId(0xFFFF);
            
            // Convert the user ID string to byte array for manufacturer data
            // BLE advertising has a 31-byte limit, so we keep it minimal
            const userIdBytes = Array.from(bluetoothState.bleUuid).map(c => c.charCodeAt(0));
            
            console.log(`[BLE Advertiser] Broadcasting ${userIdBytes.length} bytes of data`);
            
            // Broadcast with a proper UUID format and user ID in manufacturer data
            // Using a custom UUID for our attendance system
            await BleAdvertiser.broadcast('0000FFF0-0000-1000-8000-00805F9B34FB', userIdBytes, {
              advertiseMode: BleAdvertiser.ADVERTISE_MODE_LOW_LATENCY,
              txPowerLevel: BleAdvertiser.ADVERTISE_TX_POWER_HIGH,
              connectable: false,
              includeDeviceName: false,
              includeTxPowerLevel: false,
            });

            setBluetoothState(prev => ({
              ...prev,
              isBroadcasting: true,
            }));
            
            console.log(`[BLE Advertiser] Successfully started advertising ✓`);
            return;
          } catch (error) {
            console.error('[BLE Advertiser] Failed to start advertising:', error);
            console.log('[FALLBACK] Using simulation mode instead');
          }
        }
      } catch (error) {
        console.error('[BLE Advertiser] Failed to start Bluetooth broadcasting:', error);
        console.log('[FALLBACK] Using simulation mode instead');
      }
    }

    // Simulation mode for iOS or when native fails
    setBluetoothState(prev => ({
      ...prev,
      isBroadcasting: true,
    }));

    const mode = Platform.OS === 'ios' ? 'iOS' : 'SIMULATION';
    console.log(`[${mode}] Started broadcasting UUID: ${bluetoothState.bleUuid}`);
    console.log(`[${mode}] Note: This is not real Bluetooth. Use QR code for attendance.`);
  };

  const stopBroadcasting = async (): Promise<void> => {
    // Try native BLE advertising on Android
    if (Platform.OS === 'android' && isNativeSupported && broadcastMethod === 'ble') {
      try {
        await BleAdvertiser.stopBroadcast();
        console.log('[BLE Advertiser] Stopped advertising');
      } catch (error) {
        console.error('[BLE Advertiser] Failed to stop advertising:', error);
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
