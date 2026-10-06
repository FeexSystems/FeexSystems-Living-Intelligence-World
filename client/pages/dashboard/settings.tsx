import React, { useState } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Settings, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Key,
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';

export default function SettingsPage() {
  const { toast } = useToast();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSetupOpen, setTwoFactorSetupOpen] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    // Notification preferences
    emailNotifications: true,
    pushNotifications: true,
    securityAlerts: true,
    marketingEmails: false,
    weeklyReports: true,
    deploymentNotifications: true,
    vulnerabilityAlerts: true,
    
    // Appearance
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    
    // Privacy
    profileVisibility: 'private',
    activityTracking: true,
    dataCollection: true,
    
    // Security
    sessionTimeout: '24h',
    loginNotifications: true,
    suspiciousActivityAlerts: true
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Setting Updated",
      description: "Your preference has been saved.",
    });
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast({
        title: "Password Update Failed",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTwoFactorSetup = async () => {
    try {
      // Simulate 2FA setup
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setTwoFactorEnabled(true);
      setTwoFactorSetupOpen(false);
      
      toast({
        title: "Two-Factor Authentication Enabled",
        description: "Your account is now protected with 2FA.",
      });
    } catch (error) {
      toast({
        title: "2FA Setup Failed",
        description: "Failed to enable two-factor authentication.",
        variant: "destructive",
      });
    }
  };

  const handleTwoFactorDisable = async () => {
    try {
      // Simulate 2FA disable
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTwoFactorEnabled(false);
      
      toast({
        title: "Two-Factor Authentication Disabled",
        description: "2FA has been disabled for your account.",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "2FA Disable Failed",
        description: "Failed to disable two-factor authentication.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[10px] font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and security settings
          </p>
        </div>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationPreferences />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>
                Choose your preferred color scheme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
                  { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
                  { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" /> }
                ].map((theme) => (
                  <div
                    key={theme.value}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      settings.theme === theme.value ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleSettingChange('theme', theme.value)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {theme.icon}
                      <span className="font-medium">{theme.label}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {theme.value === 'light' && 'Always use light mode'}
                      {theme.value === 'dark' && 'Always use dark mode'}
                      {theme.value === 'system' && 'Follow system preference'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Localization</CardTitle>
              <CardDescription>
                Set your language, timezone, and regional preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={settings.language} onValueChange={(value) => handleSettingChange('language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="ja">日本語</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={settings.timezone} onValueChange={(value) => handleSettingChange('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select value={settings.dateFormat} onValueChange={(value) => handleSettingChange('dateFormat', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Visibility</CardTitle>
              <CardDescription>
                Control who can see your profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Profile Visibility</Label>
                <Select value={settings.profileVisibility} onValueChange={(value) => handleSettingChange('profileVisibility', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public - Anyone can see your profile</SelectItem>
                    <SelectItem value="team">Team Only - Only team members can see your profile</SelectItem>
                    <SelectItem value="private">Private - Only you can see your profile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Collection</CardTitle>
              <CardDescription>
                Manage how we collect and use your data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Activity Tracking</div>
                  <div className="text-[10px] text-muted-foreground">
                    Allow us to track your usage to improve our services
                  </div>
                </div>
                <Switch
                  checked={settings.activityTracking}
                  onCheckedChange={(checked) => handleSettingChange('activityTracking', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Analytics Data Collection</div>
                  <div className="text-[10px] text-muted-foreground">
                    Help us improve by sharing anonymous usage data
                  </div>
                </div>
                <Switch
                  checked={settings.dataCollection}
                  onCheckedChange={(checked) => handleSettingChange('dataCollection', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Change your account password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button onClick={handlePasswordChange}>
                <Lock className="h-4 w-4 mr-2" />
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Two-Factor Authentication</div>
                  <div className="text-[10px] text-muted-foreground">
                    {twoFactorEnabled 
                      ? 'Your account is protected with 2FA' 
                      : 'Secure your account with an authenticator app'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={twoFactorEnabled ? 'default' : 'secondary'}>
                    {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  {twoFactorEnabled ? (
                    <Button variant="outline" size="sm" onClick={handleTwoFactorDisable}>
                      Disable
                    </Button>
                  ) : (
                    <Dialog open={twoFactorSetupOpen} onOpenChange={setTwoFactorSetupOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Smartphone className="h-4 w-4 mr-2" />
                          Enable
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
                          <DialogDescription>
                            Scan the QR code with your authenticator app and enter the verification code.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex justify-center">
                            <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                              <div className="text-center">
                                <Key className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-[10px] text-muted-foreground">QR Code</p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="verificationCode">Verification Code</Label>
                            <Input
                              id="verificationCode"
                              placeholder="Enter 6-digit code"
                              maxLength={6}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setTwoFactorSetupOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleTwoFactorSetup}>
                            Enable 2FA
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Preferences</CardTitle>
              <CardDescription>
                Configure additional security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Session Timeout</Label>
                <Select value={settings.sessionTimeout} onValueChange={(value) => handleSettingChange('sessionTimeout', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 hour</SelectItem>
                    <SelectItem value="8h">8 hours</SelectItem>
                    <SelectItem value="24h">24 hours</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Suspicious Activity Alerts</div>
                  <div className="text-[10px] text-muted-foreground">
                    Get notified about unusual account activity
                  </div>
                </div>
                <Switch
                  checked={settings.suspiciousActivityAlerts}
                  onCheckedChange={(checked) => handleSettingChange('suspiciousActivityAlerts', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Access</CardTitle>
              <CardDescription>
                Manage API keys and access tokens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Personal Access Token</div>
                  <div className="text-[10px] text-muted-foreground">
                    Use this token to access the FeexSystems API
                  </div>
                </div>
                <Button variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  Generate Token
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Developer Settings</CardTitle>
              <CardDescription>
                Advanced settings for developers and power users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Debug Mode</div>
                  <div className="text-[10px] text-muted-foreground">
                    Enable detailed logging and debugging information
                  </div>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Beta Features</div>
                  <div className="text-[10px] text-muted-foreground">
                    Get early access to experimental features
                  </div>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-zinc-400">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border border-zinc-600 rounded-lg bg-zinc-900/80 dark:bg-zinc-900/80">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-zinc-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-zinc-400 dark:text-zinc-400">Reset All Settings</h4>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-400 mb-3">
                      This will reset all your preferences to default values. This action cannot be undone.
                    </p>
                    <Button variant="destructive" size="sm">
                      Reset All Settings
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </DashboardLayout>
  );
}