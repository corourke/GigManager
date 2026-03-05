import React from 'react';
import { LayoutDashboard, Barcode, Settings } from 'lucide-react';
import { cn } from '../ui/utils';

interface MobileLayoutProps {
  children: React.ReactNode;
  currentRoute: string;
  onNavigate: (route: any) => void;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children, currentRoute, onNavigate }) => {
  const navItems = [
    { id: 'mobile-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'mobile-inventory', label: 'Inventory', icon: Barcode },
    { id: 'mobile-settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 pt-safe px-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border pb-safe pt-2">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id || (item.id === 'mobile-inventory' && currentRoute === 'mobile-scanner');
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default MobileLayout;
