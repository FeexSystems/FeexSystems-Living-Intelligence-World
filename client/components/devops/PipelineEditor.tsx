import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import '@/components/ui/checkbox';
import { Plus, Trash2, MoveUp, MoveDown } from 'lucide-react';
import { Pipeline, PipelineStage, PipelineTrigger } from '@/shared/api';

interface PipelineEditorProps {
  pipeline?: Pipeline;
  onSave: () => void;
  onCancel: () => void;
}

export function PipelineEditor({ pipeline, onSave, onCancel }: PipelineEditorProps) {
  const [name, setName] = useState(pipeline?.name || '');
  const [repositoryId, setRepositoryId] = useState(pipeline?.repositoryId || '');
  const [stages, setStages] = useState<PipelineStage[]>(pipeline?.stages || [
    {
      id: 'build',
      name: 'Build',
      commands: ['npm install', 'npm run build'],
      environment: {},
      dependsOn: [],
      timeout: 300
    }
  ]);
  const [triggers, setTriggers] = useState<PipelineTrigger[]>(pipeline?.triggers || [
    {
      type: 'push',
      branches: ['main']
    }
  ]);
  const [environment, setEnvironment] = useState<Record<string, string>>(pipeline?.environment || {});

  const addStage = () => {
    const newStage: PipelineStage = {
      id: `stage-${Date.now()}`,
      name: 'New Stage',
      commands: ['echo "Hello World"'],
      environment: {},
      dependsOn: [],
      timeout: 300
    };
    setStages([...stages, newStage]);
  };

  const updateStage = (index: number, updatedStage: Partial<PipelineStage>) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], ...updatedStage };
    setStages(newStages);
  };

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const newStages = [...stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newStages.length) {
      [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
      setStages(newStages);
    }
  };

  const addTrigger = () => {
    const newTrigger: PipelineTrigger = {
      type: 'push',
      branches: ['main']
    };
    setTriggers([...triggers, newTrigger]);
  };

  const updateTrigger = (index: number, updatedTrigger: Partial<PipelineTrigger>) => {
    const newTriggers = [...triggers];
    newTriggers[index] = { ...newTriggers[index], ...updatedTrigger };
    setTriggers(newTriggers);
  };

  const removeTrigger = (index: number) => {
    setTriggers(triggers.filter((_, i) => i !== index));
  };

  const addEnvironmentVariable = () => {
    const key = `VAR_${Object.keys(environment).length + 1}`;
    setEnvironment({ ...environment, [key]: '' });
  };

  const updateEnvironmentVariable = (oldKey: string, newKey: string, value: string) => {
    const newEnv = { ...environment };
    if (oldKey !== newKey) {
      delete newEnv[oldKey];
    }
    newEnv[newKey] = value;
    setEnvironment(newEnv);
  };

  const removeEnvironmentVariable = (key: string) => {
    const newEnv = { ...environment };
    delete newEnv[key];
    setEnvironment(newEnv);
  };

  const handleSave = () => {
    // Validate form
    if (!name.trim()) {
      alert('Pipeline name is required');
      return;
    }
    
    if (stages.length === 0) {
      alert('At least one stage is required');
      return;
    }

    // In a real app, this would make an API call
    console.log('Saving pipeline:', {
      name,
      repositoryId,
      stages,
      triggers,
      environment
    });
    
    onSave();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pipeline-name">Pipeline Name</Label>
          <Input
            id="pipeline-name"
            placeholder="Enter pipeline name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="repository">Repository</Label>
          <Select value={repositoryId} onValueChange={setRepositoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select repository" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="repo1">frontend-app</SelectItem>
              <SelectItem value="repo2">api-service</SelectItem>
              <SelectItem value="repo3">mobile-app</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="stages" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stages">Stages</TabsTrigger>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
        </TabsList>

        <TabsContent value="stages" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Pipeline Stages</h3>
            <Button onClick={addStage} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Stage
            </Button>
          </div>

          <div className="space-y-4">
            {stages.map((stage, index) => (
              <Card key={stage.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <Input
                        value={stage.name}
                        onChange={(e) => updateStage(index, { name: e.target.value })}
                        className="font-medium border-none p-0 h-auto bg-transparent"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStage(index, 'up')}
                        disabled={index === 0}
                      >
                        <MoveUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStage(index, 'down')}
                        disabled={index === stages.length - 1}
                      >
                        <MoveDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStage(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Commands</Label>
                    <Textarea
                      placeholder="Enter commands (one per line)"
                      value={stage.commands.join('\n')}
                      onChange={(e) => updateStage(index, { 
                        commands: e.target.value.split('\n').filter(cmd => cmd.trim()) 
                      })}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Timeout (seconds)</Label>
                      <Input
                        type="number"
                        value={stage.timeout || 300}
                        onChange={(e) => updateStage(index, { timeout: parseInt(e.target.value) || 300 })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Depends On</Label>
                      <Select
                        value={stage.dependsOn?.[0] || ''}
                        onValueChange={(value) => updateStage(index, { 
                          dependsOn: value ? [value] : [] 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select dependency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No dependency</SelectItem>
                          {stages.slice(0, index).map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="triggers" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Pipeline Triggers</h3>
            <Button onClick={addTrigger} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Trigger
            </Button>
          </div>

          <div className="space-y-4">
            {triggers.map((trigger, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <Select
                      value={trigger.type}
                      onValueChange={(value) => updateTrigger(index, { 
                        type: value as 'push' | 'pull_request' | 'schedule' | 'manual' 
                      })}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="push">Push to branch</SelectItem>
                        <SelectItem value="pull_request">Pull request</SelectItem>
                        <SelectItem value="schedule">Scheduled</SelectItem>
                        <SelectItem value="manual">Manual only</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTrigger(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {(trigger.type === 'push' || trigger.type === 'pull_request') && (
                    <div className="space-y-2">
                      <Label>Branches</Label>
                      <Input
                        placeholder="main, develop, feature/*"
                        value={trigger.branches?.join(', ') || ''}
                        onChange={(e) => updateTrigger(index, { 
                          branches: e.target.value.split(',').map(b => b.trim()).filter(Boolean)
                        })}
                      />
                    </div>
                  )}

                  {trigger.type === 'schedule' && (
                    <div className="space-y-2">
                      <Label>Cron Expression</Label>
                      <Input
                        placeholder="0 0 * * *"
                        value={trigger.schedule || ''}
                        onChange={(e) => updateTrigger(index, { schedule: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use cron syntax. Example: "0 0 * * *" for daily at midnight
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="environment" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Environment Variables</h3>
            <Button onClick={addEnvironmentVariable} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Variable
            </Button>
          </div>

          <div className="space-y-3">
            {Object.entries(environment).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <Input
                  placeholder="Variable name"
                  value={key}
                  onChange={(e) => updateEnvironmentVariable(key, e.target.value, value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Variable value"
                  value={value}
                  onChange={(e) => updateEnvironmentVariable(key, key, e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEnvironmentVariable(key)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {Object.keys(environment).length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No environment variables configured. Click "Add Variable" to get started.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          {pipeline ? 'Update Pipeline' : 'Create Pipeline'}
        </Button>
      </div>
    </div>
  );
}