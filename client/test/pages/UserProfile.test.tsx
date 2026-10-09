import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UserProfile from '@/pages/UserProfile';
import { TestWrapper, createMockUser } from '../utils/test-utils';

// Mock the useAuth hook
const mockUpdateProfile = vi.fn();
const mockUploadProfileImage = vi.fn();
const mockClearError = vi.fn();
const mockUseAuth = {
  user: createMockUser(),
  updateProfile: mockUpdateProfile,
  uploadProfileImage: mockUploadProfileImage,
  isLoading: false,
  error: null,
  clearError: mockClearError,
};

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth,
}));

const TestUserProfileWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <TestWrapper>
      {children}
    </TestWrapper>
  </BrowserRouter>
);

describe('UserProfile Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.user = createMockUser();
    mockUseAuth.isLoading = false;
    mockUseAuth.error = null;
  });

  it('should render profile page with user information', () => {
    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    expect(screen.getByText('Manage your account information and preferences')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test')).toBeInTheDocument(); // First name
    expect(screen.getByDisplayValue('User')).toBeInTheDocument(); // Last name
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument(); // Email
  });

  it('should show loading spinner when user is not available', () => {
    mockUseAuth.user = null;

    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('should enable editing mode when edit button is clicked', async () => {
    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    // Form fields should be enabled
    const firstNameInput = screen.getByDisplayValue('Test');
    expect(firstNameInput).not.toBeDisabled();
  });

  it('should validate required fields', async () => {
    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    // Enter edit mode
    fireEvent.click(screen.getByText('Edit Profile'));

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    // Clear first name field
    const firstNameInput = screen.getByDisplayValue('Test');
    fireEvent.change(firstNameInput, { target: { value: '' } });

    // Try to save
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
    });
  });

  it('should call updateProfile with correct data on form submission', async () => {
    mockUpdateProfile.mockResolvedValueOnce(undefined);

    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    // Enter edit mode
    fireEvent.click(screen.getByText('Edit Profile'));

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    // Update first name
    const firstNameInput = screen.getByDisplayValue('Test');
    fireEvent.change(firstNameInput, { target: { value: 'Updated' } });

    // Save changes
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        firstName: 'Updated',
        lastName: 'User',
        email: 'test@example.com',
      });
    });
  });

  it('should exit edit mode after successful save', async () => {
    mockUpdateProfile.mockResolvedValueOnce(undefined);

    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    // Enter edit mode
    fireEvent.click(screen.getByText('Edit Profile'));

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    // Update and save
    const firstNameInput = screen.getByDisplayValue('Test');
    fireEvent.change(firstNameInput, { target: { value: 'Updated' } });
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
    });
  });

  it('should cancel editing and reset form', async () => {
    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    // Enter edit mode
    fireEvent.click(screen.getByText('Edit Profile'));

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    // Make changes
    const firstNameInput = screen.getByDisplayValue('Test');
    fireEvent.change(firstNameInput, { target: { value: 'Changed' } });

    // Cancel
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test')).toBeInTheDocument(); // Should be reset
    });
  });

  it('should handle image upload', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    const fileInput = screen.getByLabelText('Upload profile image');
    expect(fileInput).toBeInTheDocument();

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Should show save image button
    await waitFor(() => {
      expect(screen.getByText('Save Image')).toBeInTheDocument();
    });
  });

  it('should validate image file type', async () => {
    const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    const fileInput = screen.getByLabelText('Upload profile image');
    
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Should not show save image button for invalid file type
    expect(screen.queryByText('Save Image')).not.toBeInTheDocument();
  });

  it('should validate image file size', async () => {
    // Create a file larger than 5MB
    const mockFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    
    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    const fileInput = screen.getByLabelText('Upload profile image');
    
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Should not show save image button for oversized file
    expect(screen.queryByText('Save Image')).not.toBeInTheDocument();
  });

  it('should call uploadProfileImage when save image is clicked', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    mockUploadProfileImage.mockResolvedValueOnce('https://example.com/image.jpg');
    mockUpdateProfile.mockResolvedValueOnce(undefined);
    
    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    // Upload file
    const fileInput = screen.getByLabelText('Upload profile image');
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(screen.getByText('Save Image')).toBeInTheDocument();
    });

    // Click save image
    fireEvent.click(screen.getByText('Save Image'));

    await waitFor(() => {
      expect(mockUploadProfileImage).toHaveBeenCalledWith(mockFile);
    });
  });

  it('should show loading state during profile update', () => {
    mockUseAuth.isLoading = true;

    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    // Enter edit mode
    fireEvent.click(screen.getByText('Edit Profile'));

    const saveButton = screen.getByText('Saving...');
    expect(saveButton).toBeDisabled();
  });

  it('should display error message when update fails', () => {
    mockUseAuth.error = 'Update failed';

    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    // Enter edit mode
    fireEvent.click(screen.getByText('Edit Profile'));

    expect(screen.getByText('Update failed')).toBeInTheDocument();
  });

  it('should display user role and email verification status', () => {
    mockUseAuth.user = createMockUser({ 
      role: 'ADMIN', 
      emailVerified: true 
    });

    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('should show unverified status for unverified email', () => {
    mockUseAuth.user = createMockUser({ 
      emailVerified: false 
    });

    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    expect(screen.getByText('Unverified')).toBeInTheDocument();
  });

  it('should clear errors on component mount', () => {
    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    expect(mockClearError).toHaveBeenCalled();
  });

  it('should disable save button when form is not dirty', async () => {
    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    // Enter edit mode
    fireEvent.click(screen.getByText('Edit Profile'));

    await waitFor(() => {
      const saveButton = screen.getByText('Save Changes');
      expect(saveButton).toBeDisabled();
    });
  });

  it('should remove profile image when remove button is clicked', async () => {
    mockUseAuth.user = createMockUser({ 
      profileImageUrl: 'https://example.com/image.jpg' 
    });

    render(
      <TestUserProfileWrapper>
        <UserProfile />
      </TestUserProfileWrapper>
    );

    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);

    // Remove button should disappear
    await waitFor(() => {
      expect(screen.queryByText('Remove')).not.toBeInTheDocument();
    });
  });
});