import React, { useState } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { User, Calendar, Shield, Camera, Edit, Save, X, Activity, CreditCard, Settings, Download, Trash2, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
    location: '',
    bio: '',
    company: '',
    jobTitle: '',
    website: ''
  });

  const handleSave = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setProfileData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: '',
      location: '',
      bio: '',
      company: '',
      jobTitle: '',
      website: ''
    });
    setIsEditing(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Simulate image upload
      toast({
        title: "Image Uploaded",
        description: "Profile image has been updated successfully.",
      });
    }
  };

  const handleDataExport = () => {
    toast({
      title: "Data Export Started",
      description: "Your data export will be ready for download shortly.",
    });
  };

  const handleAccountDeletion = () => {
    toast({
      title: "Account Deletion Requested",
      description: "Please check your email for confirmation instructions.",
      variant: "destructive",
    });
  };

  return (
    <DashboardLayout>
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[10px] font-bold">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account information and preferences
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="data">Data & Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user?.profileImageUrl} alt={user?.firstName} />
                    <AvatarFallback className="text-[10px]">
                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90">
                      <Camera className="h-4 w-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-[10px] font-bold">
                      {user?.firstName} {user?.lastName}
                    </h2>
                    <Badge variant={user?.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {user?.role}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-2">{user?.email}</p>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Joined January 2024
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      Email Verified
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    disabled={!isEditing}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profileData.location}
                    onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                    disabled={!isEditing}
                    placeholder="City, Country"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
              <CardDescription>
                Add your professional details and work information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={profileData.company}
                    onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Your company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={profileData.jobTitle}
                    onChange={(e) => setProfileData({ ...profileData, jobTitle: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Your job title"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={profileData.website}
                  onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                  disabled={!isEditing}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Activity</CardTitle>
              <CardDescription>
                Recent activity and usage statistics for your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Usage Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-[10px] font-bold text-white">47</div>
                  <div className="text-[10px] text-muted-foreground">AI Requests</div>
                  <div className="text-[10px] text-muted-foreground mt-1">This month</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-[10px] font-bold text-[#00ff41]">12</div>
                  <div className="text-[10px] text-muted-foreground">Deployments</div>
                  <div className="text-[10px] text-muted-foreground mt-1">This month</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-[10px] font-bold text-white">8</div>
                  <div className="text-[10px] text-muted-foreground">Security Scans</div>
                  <div className="text-[10px] text-muted-foreground mt-1">This month</div>
                </div>
              </div>

              <Separator />

              {/* Recent Activity */}
              <div>
                <h3 className="text-[10px] font-medium mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {[
                    {
                      action: 'Completed security scan',
                      target: 'Production Web App',
                      time: '2 hours ago',
                      icon: <Shield className="h-4 w-4 text-[#00ff41]" />
                    },
                    {
                      action: 'Deployed to production',
                      target: 'frontend-app',
                      time: '5 hours ago',
                      icon: <Activity className="h-4 w-4 text-white" />
                    },
                    {
                      action: 'Updated profile information',
                      target: 'Personal details',
                      time: '1 day ago',
                      icon: <User className="h-4 w-4 text-gray-500" />
                    },
                    {
                      action: 'Created AI request',
                      target: 'Code review assistant',
                      time: '2 days ago',
                      icon: <Activity className="h-4 w-4 text-white" />
                    }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      {activity.icon}
                      <div className="flex-1">
                        <div className="font-medium">{activity.action}</div>
                        <div className="text-[10px] text-muted-foreground">{activity.target}</div>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{activity.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
              <CardDescription>
                Current subscription plan and usage information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Plan */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Professional Plan</h3>
                  <p className="text-[10px] text-muted-foreground">$29/month • Renews on Feb 20, 2024</p>
                </div>
                <Badge variant="default">Active</Badge>
              </div>

              {/* Usage Limits */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-medium">Usage This Month</h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-medium">AI Requests</span>
                      <span className="text-[10px] text-muted-foreground">47 / 1000</span>
                    </div>
                    <Progress value={4.7} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-medium">Deployments</span>
                      <span className="text-[10px] text-muted-foreground">12 / 100</span>
                    </div>
                    <Progress value={12} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-medium">Security Scans</span>
                      <span className="text-[10px] text-muted-foreground">8 / 50</span>
                    </div>
                    <Progress value={16} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-medium">Storage</span>
                      <span className="text-[10px] text-muted-foreground">2.3 GB / 10 GB</span>
                    </div>
                    <Progress value={23} className="h-2" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button variant="outline">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Billing
                </Button>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Change Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data & Privacy</CardTitle>
              <CardDescription>
                Manage your data, privacy settings, and account deletion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Data Export */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-medium">Data Export</h3>
                <p className="text-[10px] text-muted-foreground">
                  Download a copy of all your data including profile information, usage history, and generated content.
                </p>
                <Button variant="outline" onClick={handleDataExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export My Data
                </Button>
              </div>

              <Separator />

              {/* Privacy Settings */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-medium">Privacy Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Profile Visibility</div>
                      <div className="text-[10px] text-muted-foreground">Control who can see your profile information</div>
                    </div>
                    <Badge variant="outline">Private</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Activity Tracking</div>
                      <div className="text-[10px] text-muted-foreground">Allow analytics and usage tracking</div>
                    </div>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Marketing Communications</div>
                      <div className="text-[10px] text-muted-foreground">Receive product updates and newsletters</div>
                    </div>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Account Deletion */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-medium text-zinc-400">Danger Zone</h3>
                <div className="p-4 border border-zinc-600 rounded-lg bg-zinc-900/80 dark:bg-zinc-900/80">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-zinc-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-zinc-400 dark:text-zinc-400">Delete Account</h4>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-400 mb-3">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <Button variant="destructive" size="sm" onClick={handleAccountDeletion}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
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