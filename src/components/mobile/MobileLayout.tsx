import React from 'react';
import { LayoutDashboard, Barcode, Settings } from 'lucide-react';
import { cn } from '../ui/utils';

interface MobileLayoutProps {
  children: React.ReactNode;
  currentRoute: string;
  onNavigate: (route: string) => void;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children, currentRoute, onNavigate }) => {
  const navItems = [
    { id: 'mobile-dashboard', label: 'Gigs', icon: LayoutDashboard },
    { id: 'mobile-inventory', label: 'Scanning', icon: Barcode },
    { id: 'mobile-settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 grid grid-rows-[auto_1fr_auto] bg-background overflow-hidden">
      {/* Fixed Top Header */}
      <header className="bg-background border-b border-border pt-safe z-50">
        <div className="flex items-center justify-between h-14 px-4">
          <span className="text-xl font-bold text-sky-600 tracking-tight">GigManager</span>
          <div className="w-8 h-8 rounded-full bg-muted border border-border" />
        </div>
      </header>

      {/* Independent Scroll Area */}
      <main className="overflow-y-auto -webkit-overflow-scrolling-touch h-full">
        {children}
      </main>

      {/* Fixed Bottom Navigation */}
      <nav className="bg-background border-t border-border pb-safe z-50">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id || 
                            (item.id === 'mobile-inventory' && (currentRoute === 'mobile-inventory' || currentRoute === 'mobile-scanner'));
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:bg-muted/50 rounded-lg",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "p-1 rounded-md transition-colors",
                  isActive ? "bg-primary/10" : ""
                )}>
                  <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
                </div>
                <span className="text-[10px] font-bold tracking-wide uppercase">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default MobileLayout;
