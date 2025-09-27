import React, { useState, useEffect } from 'react'
import { useRoutineStore } from '../stores/routineStore'
import { useSyncStore } from '../stores/syncStore'
import { useAuthStore } from '../stores/authStore'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { Separator } from './ui/separator'
import { Clock, Plus, Play, Pause, Trash2, Edit, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const RoutineSection: React.FC = () => {
  const { user } = useAuthStore()
  const { repositories } = useSyncStore()
  const {
    routines,
    executions,
    isLoading,
    error,
    fetchRoutines,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    toggleRoutine,
    fetchRoutineExecutions,
    clearError
  } = useRoutineStore()
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<any>(null)
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    repository_id: '',
    sync_type: 'pull' as 'pull' | 'push' | 'bidirectional',
    schedule_cron: '0 9 * * 1-5', // Default: weekdays at 9 AM
    is_active: true
  })

  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, clearError])

  const handleInputChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.repository_id) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      if (editingRoutine) {
        await updateRoutine(editingRoutine.id, formData)
        toast.success('Rotina atualizada com sucesso!')
      } else {
        await createRoutine(formData)
        toast.success('Rotina criada com sucesso!')
      }

      // Reset form
      setFormData({
        name: '',
        repository_id: '',
        sync_type: 'pull',
        schedule_cron: '0 9 * * 1-5',
        is_active: true
      })
      setShowCreateForm(false)
      setEditingRoutine(null)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar rotina')
    }
  }

  const handleEdit = (routine: any) => {
    setFormData({
      name: routine.name,
      repository_id: '',
      sync_type: 'pull',
      schedule_cron: routine.schedule,
      is_active: routine.enabled
    })
    setEditingRoutine(routine)
    setShowCreateForm(true)
  }

  const handleDelete = async (routineId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta rotina?')) {
      try {
        await deleteRoutine(routineId)
        toast.success('Rotina excluída com sucesso!')
      } catch (error: any) {
        toast.error(error.message || 'Erro ao excluir rotina')
      }
    }
  }

  const handleToggle = async (routineId: string) => {
    try {
      await toggleRoutine(routineId)
      toast.success('Status da rotina atualizado!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar rotina')
    }
  }

  const handleViewExecutions = async (routineId: string) => {
    setSelectedRoutineId(routineId)
    await fetchRoutineExecutions(routineId)
  }

  const getScheduleDescription = (schedule: string) => {
    const scheduleMap: { [key: string]: string } = {
      '0 9 * * 1-5': 'Dias úteis às 9:00',
      '0 18 * * 5': 'Sextas-feiras às 18:00',
      '0 0 * * 0': 'Domingos à meia-noite',
      '0 */6 * * *': 'A cada 6 horas',
      '0 12 * * *': 'Diariamente ao meio-dia',
      '0 0 1 * *': 'Primeiro dia do mês'
    }
    return scheduleMap[schedule] || 'Agendamento personalizado'
  }

  const getExecutionStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'running':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Rotinas Automatizadas
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure sincronizações automáticas em horários específicos
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Rotina
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingRoutine ? 'Editar Rotina' : 'Nova Rotina'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome da Rotina</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ex: Sync diário do projeto"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Repositório</label>
                  <Select value={formData.repository_id} onValueChange={(value) => handleInputChange('repository_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um repositório" />
                    </SelectTrigger>
                    <SelectContent>
                      {repositories.map((repo) => (
                        <SelectItem key={repo.id} value={repo.id}>
                          {repo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Sincronização</label>
                  <Select value={formData.sync_type} onValueChange={(value: 'pull' | 'push' | 'bidirectional') => handleInputChange('sync_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pull">Pull (Baixar)</SelectItem>
                      <SelectItem value="push">Push (Enviar)</SelectItem>
                      <SelectItem value="bidirectional">Bidirecional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Agendamento</label>
                  <Select value={formData.schedule_cron} onValueChange={(value) => handleInputChange('schedule_cron', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0 9 * * 1-5">Dias úteis às 9:00</SelectItem>
                      <SelectItem value="0 18 * * 5">Sextas-feiras às 18:00</SelectItem>
                      <SelectItem value="0 0 * * 0">Domingos à meia-noite</SelectItem>
                      <SelectItem value="0 */6 * * *">A cada 6 horas</SelectItem>
                      <SelectItem value="0 12 * * *">Diariamente ao meio-dia</SelectItem>
                      <SelectItem value="0 0 1 * *">Primeiro dia do mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <label className="text-sm font-medium">
                  Ativar rotina imediatamente
                </label>
              </div>
              
              <div className="flex space-x-3">
                <Button type="submit" disabled={isLoading}>
                  {editingRoutine ? 'Atualizar' : 'Criar'} Rotina
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false)
                    setEditingRoutine(null)
                    setFormData({
                      name: '',
                      repository_id: '',
                      sync_type: 'pull',
                      schedule_cron: '0 9 * * 1-5',
                      is_active: true
                    })
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Routines List */}
      <Card>
        <CardHeader>
          <CardTitle>Rotinas Configuradas</CardTitle>
        </CardHeader>
        <CardContent>
          {routines.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Nenhuma rotina configurada ainda
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {routines.map((routine) => {
                return (
                  <div
                    key={routine.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-md"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          routine.enabled ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {routine.name}
                        </h4>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <p>
                          <span className="font-medium">Descrição:</span>{' '}
                          {routine.description || 'Sem descrição'}
                        </p>
                        <p>
                          <span className="font-medium">Agendamento:</span> {getScheduleDescription(routine.schedule)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewExecutions(routine.id)}
                        title="Ver execuções"
                      >
                        <Calendar className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(routine.id)}
                        title={routine.enabled ? 'Pausar rotina' : 'Ativar rotina'}
                      >
                        {routine.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(routine)}
                        title="Editar rotina"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(routine.id)}
                        title="Excluir rotina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Routine Executions */}
      {selectedRoutineId && executions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Execuções</CardTitle>
            <CardDescription>
              Últimas execuções da rotina selecionada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {executions.slice(0, 10).map((execution) => (
                <div
                  key={execution.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getExecutionStatusIcon(execution.status)}
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(execution.startedAt).toLocaleString()}
                      </p>
                      {execution.errorMessage && (
                        <p className="text-xs text-red-600">
                          {execution.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge className={getExecutionStatusColor(execution.status)}>
                    {execution.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export { RoutineSection }
export default RoutineSection