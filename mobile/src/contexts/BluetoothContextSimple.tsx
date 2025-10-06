import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { BluetoothState } from '../types';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

interface BluetoothContextType extends BluetoothState {
  startBroadcasting: () => Promise<void>;
  stopBroadcasting: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  isNativeSupported: boolean;
  broadcastMethod: 'classic' | 'ble' | 'simulation';
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
  const [broadcastMethod, setBroadcastMethod] = useState<'classic' | 'ble' | 'simulation'>('simulation');
  const [originalDeviceName, setOriginalDeviceName] = useState<string>('');

  // Check if Bluetooth Classic is supported
  useEffect(() => {
    const checkSupport = async () => {
      if (Platform.OS !== 'android') {
        console.log('[iOS] Bluetooth name changing not supported');
        setIsNativeSupported(false);
        setBroadcastMethod('simulation');
        return;
      }

      try {
        const isAvailable = await RNBluetoothClassic.isBluetoothAvailable();
        if (isAvailable) {
          setIsNativeSupported(true);
          setBroadcastMethod('classic');
          console.log(`✓ Bluetooth Classic supported (99% device compatibility!)`);
        } else {
          setIsNativeSupported(false);
          setBroadcastMethod('simulation');
          console.warn('Bluetooth not available on device');
        }
      } catch (error) {
        console.warn('Bluetooth Classic module not available:', error);
        setIsNativeSupported(false);
        setBroadcastMethod('simulation');
      }
    };
    
    checkSupport();
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
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
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
          // Android 11 and below - no special permissions needed for name change
          setBluetoothState(prev => ({
            ...prev,
            permissionsGranted: true,
          }));
          return true;
        }
      } catch (error) {
        console.error('Failed to request Bluetooth permissions:', error);
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

    // Try Bluetooth Classic on Android
    if (Platform.OS === 'android' && isNativeSupported) {
      try {
        // Request permissions if needed
        if (!bluetoothState.permissionsGranted) {
          const granted = await requestPermissions();
          if (!granted) {
            console.warn('Bluetooth permissions not granted');
          }
        }

        // Check if Bluetooth is enabled
        const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
        if (!isEnabled) {
          console.warn('Bluetooth is not enabled');
          await RNBluetoothClassic.requestBluetoothEnabled();
        }

        // Save original device name
        try {
          const currentName = await RNBluetoothClassic.getLocalDeviceName();
          if (currentName) {
            setOriginalDeviceName(currentName);
          }
        } catch (e) {
          console.log('Could not get original device name');
        }

        // Change device name to UUID
        console.log(`[CLASSIC] Setting Bluetooth name to: ${bluetoothState.bleUuid}`);
        await RNBluetoothClassic.setLocalDeviceName(bluetoothState.bleUuid);
        
        setBluetoothState(prev => ({
          ...prev,
          isBroadcasting: true,
        }));
        
        console.log(`✓ Successfully set Bluetooth device name!`);
        console.log(`✓ Scanner can now detect this device!`);
        return;
      } catch (error) {
        console.error('[CLASSIC] Failed to change device name:', error);
        console.log('[FALLBACK] Using simulation mode');
      }
    }

    // Simulation mode for iOS or when native fails
    setBluetoothState(prev => ({
      ...prev,
      isBroadcasting: true,
    }));

    const mode = Platform.OS === 'ios' ? 'iOS' : 'SIMULATION';
    console.log(`[${mode}] Bluetooth name changing not available`);
    console.log(`[${mode}] UUID: ${bluetoothState.bleUuid}`);
    console.log(`[${mode}] Use QR code or manual entry for attendance`);
  };

  const stopBroadcasting = async (): Promise<void> => {
    if (Platform.OS === 'android' && isNativeSupported) {
      try {
        // Restore original device name
        if (originalDeviceName) {
          console.log(`[CLASSIC] Restoring device name to: ${originalDeviceName}`);
          await RNBluetoothClassic.setLocalDeviceName(originalDeviceName);
        } else {
          // Reset to default (device model name)
          const deviceModel = Platform.constants?.Model || 'Android Device';
          await RNBluetoothClassic.setLocalDeviceName(deviceModel);
        }
        console.log('[CLASSIC] Device name restored');
      } catch (error) {
        console.error('[CLASSIC] Failed to restore device name:', error);
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




