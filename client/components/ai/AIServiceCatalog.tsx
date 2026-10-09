import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Zap, Brain, MessageSquare, FileText, Mic, Eye, ExternalLink, Clock, DollarSign } from 'lucide-react';
import { 
  AIServiceCategory, 
  type AIService 
} from '@shared/api';

interface AIServiceCatalogProps {
  services: AIService[];
  onServiceSelect: (service: AIService) => void;
  isLoading?: boolean;
}

export function AIServiceCatalog({ services, onServiceSelect, isLoading }: AIServiceCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');

  const getCategoryIcon = (category: AIServiceCategory) => {
    const icons = {
      [AIServiceCategory.CHAT]: MessageSquare,
      [AIServiceCategory.ANALYSIS]: Brain,
      [AIServiceCategory.GENERATION]: FileText,
      [AIServiceCategory.PROCESSING]: Zap,
      [AIServiceCategory.VISION]: Eye,
      [AIServiceCategory.AUDIO]: Mic
    };
    return icons[category] || Brain;
  };

  const getCategoryColor = (category: AIServiceCategory) => {
    const colors = {
      [AIServiceCategory.CHAT]: 'text-blue-600 bg-blue-50 border-blue-200',
      [AIServiceCategory.ANALYSIS]: 'text-purple-600 bg-purple-50 border-purple-200',
      [AIServiceCategory.GENERATION]: 'text-green-600 bg-green-50 border-green-200',
      [AIServiceCategory.PROCESSING]: 'text-orange-600 bg-orange-50 border-orange-200',
      [AIServiceCategory.VISION]: 'text-pink-600 bg-pink-50 border-pink-200',
      [AIServiceCategory.AUDIO]: 'text-indigo-600 bg-indigo-50 border-indigo-200'
    };
    return colors[category] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.provider.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
    const matchesProvider = providerFilter === 'all' || service.provider === providerFilter;
    return matchesSearch && matchesCategory && matchesProvider && service.isActive;
  });

  const providers = Array.from(new Set(services.map(service => service.provider)));
  const categories = Object.values(AIServiceCategory);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search AI services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0) + category.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.map(provider => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Service Grid */}
      {filteredServices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No services found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || categoryFilter !== 'all' || providerFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'No AI services are currently available'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => {
            const CategoryIcon = getCategoryIcon(service.category);
            
            return (
              <Card key={service.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${getCategoryColor(service.category)}`}>
                        <CategoryIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{service.name}</CardTitle>
                        <CardDescription className="text-sm">
                          by {service.provider}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className={getCategoryColor(service.category)}>
                      {service.category.toLowerCase()}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {service.description}
                  </p>
                  
                  {/* Capabilities */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Capabilities</h4>
                    <div className="flex flex-wrap gap-1">
                      {service.capabilities.slice(0, 3).map((capability, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {capability}
                        </Badge>
                      ))}
                      {service.capabilities.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{service.capabilities.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Pricing */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <DollarSign className="w-4 h-4 mr-1" />
                      <span>
                        ${service.pricing.inputTokenPrice}/1K tokens
                      </span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{service.limits.rateLimitPerMinute}/min</span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      className="flex-1" 
                      onClick={() => onServiceSelect(service)}
                      disabled={isLoading}
                    >
                      Use Service
                    </Button>
                    {service.documentationUrl && (
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4" />
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