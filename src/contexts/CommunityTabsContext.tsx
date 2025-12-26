import { createContext, useContext, useState, ReactNode } from 'react';

interface CommunityTabsContextType {
  communityId: string | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setCommunityId: (id: string | null) => void;
  tabs: { value: string; label: string }[];
  setTabs: (tabs: { value: string; label: string }[]) => void;
}

const CommunityTabsContext = createContext<CommunityTabsContextType | null>(null);

export function CommunityTabsProvider({ children }: { children: ReactNode }) {
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [tabs, setTabs] = useState<{ value: string; label: string }[]>([]);

  return (
    <CommunityTabsContext.Provider value={{ 
      communityId, 
      activeTab, 
      setActiveTab, 
      setCommunityId,
      tabs,
      setTabs
    }}>
      {children}
    </CommunityTabsContext.Provider>
  );
}

export function useCommunityTabs() {
  const context = useContext(CommunityTabsContext);
  if (!context) {
    throw new Error('useCommunityTabs must be used within CommunityTabsProvider');
  }
  return context;
}
