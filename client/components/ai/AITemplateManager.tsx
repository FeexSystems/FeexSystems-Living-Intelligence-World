import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Filter,
  Bookmark,
  BookmarkCheck,
  Eye,
  Edit,
  Trash2,
  Copy,
  Users,
  Lock,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  AIRequestTemplate, 
  AIService,
  CreateAITemplateRequest 
} from '@shared/api';

interface AITemplateManagerProps {
  templates: AIRequestTemplate[];
  services: AIService[];
  onTemplateCreate?: (template: CreateAITemplateRequest) => Promise<void>;
  onTemplateUpdate?: (templateId: string, template: Partial<CreateAITemplateRequest>) => Promise<void>;
  onTemplateDelete?: (templateId: string) => Promise<void>;
  onTemplateUse?: (template: AIRequestTemplate) => void;
  isLoading?: boolean;
}

export function AITemplateManager({ 
  templates, 
  services,
  onTemplateCreate,
  onTemplateUpdate,
  onTemplateDelete,
  onTemplateUse,
  isLoading: _isLoading 
}: AITemplateManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [showPublicOnly, setShowPublicOnly] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AIRequestTemplate | null>(null);

  // Form state for creating/editing templates
  const [formData, setFormData] = useState<CreateAITemplateRequest>({
    name: '',
    description: '',
    serviceId: '',
    category: '',
    input: '',
    parameters: {},
    isPublic: false
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      serviceId: '',
      category: '',
      input: '',
      parameters: {},
      isPublic: false
    });
    setEditingTemplate(null);
  };

  const handleCreateTemplate = async () => {
    if (!onTemplateCreate) return;
    
    try {
      await onTemplateCreate(formData);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleEditTemplate = (template: AIRequestTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      serviceId: template.serviceId,
      category: template.category,
      input: typeof template.input === 'string' ? template.input : JSON.stringify(template.input, null, 2),
      parameters: template.parameters,
      isPublic: template.isPublic
    });
    setIsCreateDialogOpen(true);
  };

  const handleUpdateTemplate = async () => {
    if (!onTemplateUpdate || !editingTemplate) return;
    
    try {
      await onTemplateUpdate(editingTemplate.id, formData);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!onTemplateDelete) return;
    
    try {
      await onTemplateDelete(templateId);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    const matchesService = serviceFilter === 'all' || template.serviceId === serviceFilter;
    const matchesVisibility = !showPublicOnly || template.isPublic;
    
    return matchesSearch && matchesCategory && matchesService && matchesVisibility;
  });

  const categories = Array.from(new Set(templates.map(t => t.category)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Template Manager</h2>
          <p className="text-muted-foreground">
            Create and manage reusable AI request templates
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate 
                  ? 'Update your AI request template'
                  : 'Create a reusable template for AI requests'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter template name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Writing, Analysis, Code"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this template does"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="service">AI Service</Label>
                <Select 
                  value={formData.serviceId} 
                  onValueChange={(value) => setFormData({ ...formData, serviceId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an AI service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - {service.provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="input">Template Input</Label>
                <Textarea
                  id="input"
                  value={formData.input}
                  onChange={(e) => setFormData({ ...formData, input: e.target.value })}
                  placeholder="Enter the template input or prompt"
                  rows={4}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="parameters">Parameters (JSON)</Label>
                <Textarea
                  id="parameters"
                  value={JSON.stringify(formData.parameters, null, 2)}
                  onChange={(e) => {
                    try {
                      const params = JSON.parse(e.target.value);
                      setFormData({ ...formData, parameters: params });
                    } catch {
                      // Invalid JSON, keep the text as is for user to fix
                    }
                  }}
                  placeholder='{"temperature": 0.7, "maxTokens": 1000}'
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="public"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                />
                <Label htmlFor="public">Make this template public</Label>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}>
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {services.map(service => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="public-only"
                checked={showPublicOnly}
                onCheckedChange={setShowPublicOnly}
              />
              <Label htmlFor="public-only" className="text-sm">Public only</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bookmark className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No templates found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || categoryFilter !== 'all' || serviceFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first AI request template to get started'
              }
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const service = services.find(s => s.id === template.serviceId);
            
            return (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.isPublic ? (
                          <Users className="w-4 h-4 text-green-600" />
                        ) : (
                          <Lock className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{template.category}</Badge>
                        <Badge variant="outline">
                          {template.usageCount} uses
                        </Badge>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onTemplateUse && (
                          <DropdownMenuItem onClick={() => onTemplateUse(template)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Use Template
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <CardDescription className="line-clamp-2">
                    {template.description}
                  </CardDescription>
                  
                  {service && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{service.name}</span> • {service.provider}
                    </div>
                  )}
                  
                  <div className="text-sm">
                    <p className="text-muted-foreground line-clamp-3">
                      {typeof template.input === 'string' 
                        ? template.input 
                        : JSON.stringify(template.input).substring(0, 100) + '...'
                      }
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-2">
                      {template.isPublic && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          Public
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {onTemplateUse && (
                      <Button 
                        className="flex-1" 
                        onClick={() => onTemplateUse(template)}
                      >
                        <BookmarkCheck className="w-4 h-4 mr-1" />
                        Use Template
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}