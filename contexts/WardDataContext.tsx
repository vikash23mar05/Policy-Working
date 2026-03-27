
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WardData } from '../types';
import { getAllDelhiWards } from '../services/wardDataService';

interface WardDataContextType {
  wards: WardData[];
  loading: boolean;
  refreshWards: () => Promise<void>;
  lastUpdated: Date | null;
}

const WardDataContext = createContext<WardDataContextType | undefined>(undefined);

export const WardDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [wards, setWards] = useState<WardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshWards = async () => {
    setLoading(true);
    try {
      const data = await getAllDelhiWards();
      setWards(data);
      setLastUpdated(new Date());
      // Save to localStorage for HTML views to access
      localStorage.setItem('shared_ward_data', JSON.stringify(data));
      localStorage.setItem('shared_ward_data_timestamp', new Date().toISOString());
    } catch (error) {
      console.error('Failed to fetch ward data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    refreshWards();
    
    // Auto-refresh every 15 minutes
    const interval = setInterval(refreshWards, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <WardDataContext.Provider value={{ wards, loading, refreshWards, lastUpdated }}>
      {children}
    </WardDataContext.Provider>
  );
};

export const useWardData = () => {
  const context = useContext(WardDataContext);
  if (context === undefined) {
    throw new Error('useWardData must be used within a WardDataProvider');
  }
  return context;
};
