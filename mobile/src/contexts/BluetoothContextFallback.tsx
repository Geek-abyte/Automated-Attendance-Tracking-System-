import React, { createContext, useContext, useState } from 'react';
import { BluetoothState } from '../types';

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
    permissionsGranted: true, // Always true in fallback mode
  });

  const requestPermissions = async (): Promise<boolean> => {
    // In fallback mode, always return true
    setBluetoothState(prev => ({
      ...prev,
      permissionsGranted: true,
    }));
    return true;
  };

  const startBroadcasting = async (): Promise<void> => {
    if (!bluetoothState.bleUuid) {
      console.warn('No BLE UUID available for broadcasting');
      return;
    }

    setBluetoothState(prev => ({
      ...prev,
      isBroadcasting: true,
    }));

    console.log(`[SIMULATION] Started broadcasting BLE UUID: ${bluetoothState.bleUuid}`);
  };

  const stopBroadcasting = async (): Promise<void> => {
    setBluetoothState(prev => ({
      ...prev,
      isBroadcasting: false,
    }));

    console.log('[SIMULATION] Stopped broadcasting BLE UUID');
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
