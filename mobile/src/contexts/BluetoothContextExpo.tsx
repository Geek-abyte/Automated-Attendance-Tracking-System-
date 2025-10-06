import React, { createContext, useContext, useState } from 'react';
import { Platform } from 'react-native';
import { BluetoothState } from '../types';

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
    permissionsGranted: true, // We'll use QR code approach
  });
  
  const [broadcastMethod] = useState<'classic' | 'ble' | 'simulation'>('simulation');

  const requestPermissions = async (): Promise<boolean> => {
    // For Expo + QR approach, no special permissions needed
    return true;
  };

  const startBroadcasting = async (): Promise<void> => {
    if (!bluetoothState.bleUuid) {
      console.warn('No UUID available');
      return;
    }

    setBluetoothState(prev => ({
      ...prev,
      isBroadcasting: true,
    }));

    console.log(`📱 Broadcasting UUID: ${bluetoothState.bleUuid}`);
    console.log(`📱 Scanner should detect this device`);
    console.log(`📱 Or show QR code for manual verification`);
  };

  const stopBroadcasting = async (): Promise<void> => {
    setBluetoothState(prev => ({
      ...prev,
      isBroadcasting: false,
    }));

    console.log(`📱 Stopped broadcasting`);
  };

  const value: BluetoothContextType = {
    ...bluetoothState,
    startBroadcasting,
    stopBroadcasting,
    requestPermissions,
    isNativeSupported: Platform.OS === 'android', // For UI purposes
    broadcastMethod,
  };

  return (
    <BluetoothContext.Provider value={value}>
      {children}
    </BluetoothContext.Provider>
  );
};




