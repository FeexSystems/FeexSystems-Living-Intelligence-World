import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Camera, Save, User, Shield, Upload, X } from 'lucide-react';
import { AmbientLivingBackground } from '@/landing/cinematic';
import { PageNav } from '@/components/navigation';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function UserProfile() {
  const { user, updateProfile, uploadProfileImage, isLoading, error, clearError } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setFocus,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    },
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
      setProfileImage(user.profileImageUrl || null);
    }
  }, [user, reset]);

  // Clear errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Focus on first name field when editing starts
  useEffect(() => {
    if (isEditing) {
      setFocus('firstName');
    }
  }, [isEditing, setFocus]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setImageFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadProfileImage = async () => {
    if (!imageFile) return;

    setIsUploadingImage(true);
    
    try {
      const uploadedImageUrl = await uploadProfileImage(imageFile);
      
      // Update user profile with new image URL
      if (user) {
        await updateProfile({ profileImageUrl: uploadedImageUrl });
      }
      
      setImageFile(null);
    } catch (error) {
      // Error is handled by the useAuth hook
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeProfileImage = () => {
    setProfileImage(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile(data);
      setIsEditing(false);
      
      // Upload image if there's a new one
      if (imageFile) {
        await handleUploadProfileImage();
      }
    } catch (error) {
      // Error is handled by the useAuth hook
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    reset();
    setProfileImage(user?.profileImageUrl || null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'destructive';
      case 'ADMIN':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const formatRoleName = (role: string) => {
    return role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!user) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-black text-white overflow-hidden">
        <AmbientLivingBackground fixed={true} opacity={25} linesOpacity={12} />
        <div className="relative z-10 animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black/90 text-white p-4 overflow-hidden">
      <AmbientLivingBackground fixed={true} opacity={25} linesOpacity={12} />
      <div className="relative z-10 max-w-2xl mx-auto space-y-6">
        {/* Enter / return navigation */}
        <PageNav backTo="/dashboard" backLabel="Dashboard" />

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-zinc-400 mt-2">
            Manage your account information and preferences
          </p>
        </div>

        {/* Profile Image Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Profile Picture
            </CardTitle>
            <CardDescription>
              Upload a profile picture to personalize your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profileImage || undefined} alt="Profile" />
                <AvatarFallback className="text-lg">
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {profileImage ? 'Change Image' : 'Upload Image'}
                  </Button>
                  
                  {profileImage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={removeProfileImage}
                      disabled={isUploadingImage}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                
                {imageFile && (
                  <Button
                    size="sm"
                    onClick={handleUploadProfileImage}
                    disabled={isUploadingImage}
                  >
                    {isUploadingImage ? 'Uploading...' : 'Save Image'}
                  </Button>
                )}
                
                <p className="text-xs text-muted-foreground">
                  JPG, PNG or GIF. Max size 5MB.
                </p>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </div>
              
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    {...register('firstName')}
                    disabled={!isEditing}
                    aria-invalid={errors.firstName ? 'true' : 'false'}
                    aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                  />
                  {errors.firstName && (
                    <div id="firstName-error" className="text-sm text-destructive" role="alert">
                      {errors.firstName.message}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    {...register('lastName')}
                    disabled={!isEditing}
                    aria-invalid={errors.lastName ? 'true' : 'false'}
                    aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                  />
                  {errors.lastName && (
                    <div id="lastName-error" className="text-sm text-destructive" role="alert">
                      {errors.lastName.message}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  disabled={!isEditing}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {errors.email && (
                  <div id="email-error" className="text-sm text-destructive" role="alert">
                    {errors.email.message}
                  </div>
                )}
              </div>

              {error && (
                <div className="text-sm text-destructive" role="alert" aria-live="polite">
                  {error}
                </div>
              )}

              {isEditing && (
                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading || !isDirty}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>
              View your account status and role information
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Account Role</Label>
                <div className="mt-1">
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {formatRoleName(user.role)}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Email Status</Label>
                <div className="mt-1">
                  <Badge variant={user.emailVerified ? 'default' : 'secondary'}>
                    {user.emailVerified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="text-sm text-muted-foreground">
              <p>Account created: {new Date().toLocaleDateString()}</p>
              <p>Last updated: {new Date().toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
