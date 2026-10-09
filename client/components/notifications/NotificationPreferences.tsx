import 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Shield, 
  Rocket, 
  Bot, 
  CreditCard, 
  Users, 
  Settings,
  AlertTriangle,
  Info,
  CheckCircle
} from 'lucide-react';
import { useNotificationStore } from '@/store/notifications';
import { useToast } from '@/hooks/use-toast';

export function NotificationPreferences() {
  const { preferences, updatePreferences } = useNotificationStore();
  const { toast } = useToast();

  const handlePreferenceChange = (key: string, value: boolean, nested?: string) => {
    if (nested) {
      updatePreferences({
        [nested]: {
          ...(preferences[nested as keyof typeof preferences] as Record<string, any>),
          [key]: value
        }
      });
    } else {
      updatePreferences({ [key]: value });
    }

    toast({
      title: "Preferences Updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive browser notifications.",
        });
      } else {
        toast({
          title: "Notifications Blocked",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
      }
    }
  };

  const testNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from FeexSystems.',
        icon: '/favicon.ico',
      });
    } else {
      toast({
        title: "Test Notification",
        description: "This is a test notification from FeexSystems.",
      });
    }
  };

  const categoryIcons = {
    system: <Settings className="h-4 w-4" />,
    security: <Shield className="h-4 w-4" />,
    deployment: <Rocket className="h-4 w-4" />,
    ai: <Bot className="h-4 w-4" />,
    billing: <CreditCard className="h-4 w-4" />,
    team: <Users className="h-4 w-4" />,
  };

  const priorityIcons = {
    low: <Info className="h-4 w-4 text-blue-500" />,
    medium: <Bell className="h-4 w-4 text-yellow-500" />,
    high: <AlertTriangle className="h-4 w-4 text-orange-500" />,
    critical: <AlertTriangle className="h-4 w-4 text-red-500" />,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Notification Preferences</h2>
        <p className="text-muted-foreground">
          Customize how and when you receive notifications
        </p>
      </div>

      {/* Delivery Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Delivery Methods
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="inApp" className="font-medium">In-App Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show notifications in the notification center
                </p>
              </div>
            </div>
            <Switch
              id="inApp"
              checked={preferences.inApp}
              onCheckedChange={(checked) => handlePreferenceChange('inApp', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="email" className="font-medium">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <Switch
              id="email"
              checked={preferences.email}
              onCheckedChange={(checked) => handlePreferenceChange('email', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="push" className="font-medium">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show browser push notifications
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!('Notification' in window) ? (
                <Badge variant="destructive">Not Supported</Badge>
              ) : Notification.permission === 'denied' ? (
                <Badge variant="destructive">Blocked</Badge>
              ) : Notification.permission === 'granted' ? (
                <Badge variant="default">Enabled</Badge>
              ) : (
                <Button size="sm" onClick={requestNotificationPermission}>
                  Enable
                </Button>
              )}
              <Switch
                id="push"
                checked={preferences.push && Notification.permission === 'granted'}
                onCheckedChange={(checked) => handlePreferenceChange('push', checked)}
                disabled={Notification.permission !== 'granted'}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={testNotification}>
              Test Notification
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Categories</CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(preferences.categories).map(([category, enabled]) => (
            <div key={category} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {categoryIcons[category as keyof typeof categoryIcons]}
                <div>
                  <Label htmlFor={category} className="font-medium capitalize">
                    {category === 'ai' ? 'AI Services' : category.replace('_', ' ')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {category === 'system' && 'System updates and maintenance notifications'}
                    {category === 'security' && 'Security alerts and vulnerability reports'}
                    {category === 'deployment' && 'Deployment status and pipeline updates'}
                    {category === 'ai' && 'AI request completions and service updates'}
                    {category === 'billing' && 'Billing alerts and subscription updates'}
                    {category === 'team' && 'Team invitations and collaboration updates'}
                  </p>
                </div>
              </div>
              <Switch
                id={category}
                checked={enabled}
                onCheckedChange={(checked) => handlePreferenceChange(category, checked, 'categories')}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Priority Levels */}
      <Card>
        <CardHeader>
          <CardTitle>Priority Levels</CardTitle>
          <CardDescription>
            Choose which priority levels you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(preferences.priorities).map(([priority, enabled]) => (
            <div key={priority} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {priorityIcons[priority as keyof typeof priorityIcons]}
                <div>
                  <Label htmlFor={priority} className="font-medium capitalize">
                    {priority} Priority
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {priority === 'low' && 'General updates and informational messages'}
                    {priority === 'medium' && 'Important updates that may require attention'}
                    {priority === 'high' && 'Urgent issues that need prompt attention'}
                    {priority === 'critical' && 'Critical alerts requiring immediate action'}
                  </p>
                </div>
              </div>
              <Switch
                id={priority}
                checked={enabled}
                onCheckedChange={(checked) => handlePreferenceChange(priority, checked, 'priorities')}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Manage your notification settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => {
                updatePreferences({
                  categories: {
                    system: true,
                    security: true,
                    deployment: true,
                    ai: true,
                    billing: true,
                    team: true,
                  }
                });
                toast({
                  title: "All Categories Enabled",
                  description: "You'll receive notifications from all categories.",
                });
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Enable All
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                updatePreferences({
                  priorities: {
                    low: false,
                    medium: true,
                    high: true,
                    critical: true,
                  }
                });
                toast({
                  title: "Important Only",
                  description: "You'll only receive medium, high, and critical notifications.",
                });
              }}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Important Only
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                updatePreferences({
                  priorities: {
                    low: false,
                    medium: false,
                    high: true,
                    critical: true,
                  }
                });
                toast({
                  title: "Critical Only",
                  description: "You'll only receive high and critical notifications.",
                });
              }}
            >
              <Shield className="h-4 w-4 mr-2" />
              Critical Only
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}