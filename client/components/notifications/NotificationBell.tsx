import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, BellRing } from 'lucide-react';
import { useNotificationStore } from '@/store/notifications';
import { NotificationCenter } from './NotificationCenter';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { unreadCount, isConnected } = useNotificationStore();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative ${className}`}
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
              variant="destructive"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          
          {/* Connection status indicator */}
          <div 
            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${
              isConnected ? 'bg-white' : 'bg-white/30'
            }`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-auto p-0" 
        align="end"
        side="bottom"
        sideOffset={8}
      >
        <NotificationCenter />
      </PopoverContent>
    </Popover>
  );
}