# Component Examples & Recipes

**Task Reference:** Phase 4, Sprint 13, Task 51

**Last Updated:** 2026-10-07

## Overview

This document provides component examples and recipes for common UI patterns in the FeexSystems application.

## Pattern Stories

### 1. Form Layout

**Components Used:** Form, FormField, FormLabel, FormControl, FormDescription, FormMessage, Input, Button

**Story:** `FormLayout.stories.tsx`

```tsx
export const SignInForm: Story = {
  render: () => (
    <Form>
      <FormField name="email">
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input type="email" placeholder="user@example.com" />
        </FormControl>
        <FormDescription>
          We'll send you a verification email
        </FormDescription>
        <FormMessage />
      </FormField>
      <FormField name="password">
        <FormLabel>Password</FormLabel>
        <FormControl>
          <Input type="password" />
        </FormControl>
        <FormMessage />
      </FormField>
      <Button type="submit">Sign In</Button>
    </Form>
  ),
};
```

**Usage:** Authentication forms, data entry forms, settings forms

### 2. Card Grid

**Components Used:** Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button

**Story:** `CardGrid.stories.tsx`

```tsx
export const ProjectGrid: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Project Alpha</CardTitle>
          <CardDescription>Frontend application</CardDescription>
        </CardHeader>
        <CardContent>
          <p>React 18 + TypeScript + Vite</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline">View Details</Button>
        </CardFooter>
      </Card>
      {/* More cards... */}
    </div>
  ),
};
```

**Usage:** Project cards, dashboard widgets, feature cards

### 3. Navigation

**Components Used:** NavigationMenu, Menubar, Breadcrumb, Button

**Story:** `Navigation.stories.tsx`

```tsx
export const MainNavigation: Story = {
  render: () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>Projects</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>All Projects</MenubarItem>
          <MenubarItem>Pinned</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Archive</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>World Model</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Spatial World</MenubarItem>
          <MenubarItem>Navigator</MenubarItem>
          <MenubarItem>Evidence</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
};
```

**Usage:** Main navigation, sidebar navigation, breadcrumb trails

### 4. Data Display

**Components Used:** Table, Badge, Button, Pagination

**Story:** `DataTable.stories.tsx`

```tsx
export const ProjectTable: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Project Alpha</TableCell>
          <TableCell>
            <Badge variant="default">Active</Badge>
          </TableCell>
          <TableCell>
            <Button variant="ghost" size="sm">View</Button>
          </TableCell>
        </TableRow>
        {/* More rows... */}
      </TableBody>
    </Table>
  ),
};
```

**Usage:** Data tables, lists, reports, admin panels

### 5. Modal Workflow

**Components Used:** Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button

**Story:** `ModalWorkflow.stories.tsx`

```tsx
export const DeleteConfirmation: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Project</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this project? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
```

**Usage:** Delete confirmations, form dialogs, settings dialogs

## Copy-Paste Ready Examples

Each example should be:

1. **Functional** - Works when copied into the application
2. **Self-contained** - All imports included
3. **Well-commented** - Explains the pattern
4. **Accessible** - Follows a11y best practices
5. **Responsive** - Works on mobile and desktop

## Testing Checklist

For each pattern:

- [ ] Story renders correctly
- [ ] Components are properly imported
- [ ] Props are correctly typed
- [ ] Interaction works as expected
- [ ] Responsive design works
- [ ] Accessibility passes axe
- [ ] Code is copy-paste ready

## Status

**Overall Status:** Pattern Recipes Documented

**Completed:** Documented 5 common patterns (form layout, card grid, navigation, data display, modal workflow)
**In Progress:** Creating actual .stories.tsx files for patterns
**Next Steps:** Create pattern story files with functional examples
