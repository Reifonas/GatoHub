import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { apiService } from '../services/apiService'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Switch } from '../components/ui/switch'
import { Separator } from '../components/ui/separator'
import GitHubLoginModal from '../components/GitHubLoginModal'
import { 
  User, 
  Github, 
  Settings, 
  Bell, 
  Shield, 
  Trash2, 
  Save,
  Eye,
  EyeOff,
  ExternalLink,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'

interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  github_username?: string
  github_connected: boolean
  preferences: {
    notifications_enabled: boolean
    auto_sync_enabled: boolean
    theme: 'light' | 'dark' | 'system'
    default_sync_type: 'pull' | 'push' | 'bidirectional'
  }
}

export const Profile: React.FC = () => {
  const { user, logout } = useAuthStore()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    notifications_enabled: true,
    auto_sync_enabled: false,
    theme: 'system' as 'light' | 'dark' | 'system',
    default_sync_type: 'bidirectional' as 'pull' | 'push' | 'bidirectional'
  })

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      const response = await apiService.getProfile() as any
      setProfile(response)
      setFormData({
        full_name: response.full_name || '',
        notifications_enabled: response.preferences?.notifications_enabled || false,
        auto_sync_enabled: response.preferences?.auto_sync_enabled || false,
        theme: response.preferences?.theme || 'light',
        default_sync_type: response.preferences?.default_sync_type || 'pull'
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Erro ao carregar perfil')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true)
      await apiService.updateProfile({
        name: formData.full_name,
        preferences: {
          notifications_enabled: formData.notifications_enabled,
          auto_sync_enabled: formData.auto_sync_enabled,
          theme: formData.theme,
          default_sync_type: formData.default_sync_type
        }
      } as any)
      toast.success('Perfil atualizado com sucesso!')
      await fetchProfile()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Erro ao atualizar perfil')
    } finally {
      setIsSaving(false)
    }
  }

  const handleConnectGitHub = async () => {
    setIsGitHubModalOpen(true)
  }

  const handleGitHubConnectionSuccess = async () => {
    setIsGitHubModalOpen(false)
    await fetchProfile()
    toast.success('GitHub conectado com sucesso!')
  }

  const handleDisconnectGitHub = async () => {
    if (window.confirm('Tem certeza que deseja desconectar sua conta do GitHub? Isso pode afetar suas sincronizações.')) {
      try {
        await apiService.disconnectGitHubAccount()
        toast.success('Conta do GitHub desconectada')
        await fetchProfile()
      } catch (error) {
        console.error('Error disconnecting GitHub:', error)
        toast.error('Erro ao desconectar GitHub')
      }
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Digite "DELETE" para confirmar')
      return
    }

    try {
      await apiService.deleteUserAccount()
      toast.success('Conta excluída com sucesso')
      logout()
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error('Erro ao excluir conta')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
              <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Erro ao carregar perfil
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Não foi possível carregar as informações do seu perfil.
          </p>
          <Button onClick={fetchProfile}>
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Configurações do Perfil
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie suas informações pessoais e preferências da conta
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Informações Pessoais</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="w-16 h-16 rounded-full"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {profile.full_name || 'Nome não informado'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {profile.email}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nome Completo
                    </label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Digite seu nome completo"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GitHub Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Github className="w-5 h-5" />
                  <span>Integração GitHub</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.github_connected ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
                          <Github className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            @{profile.github_username}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Conta conectada
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Conectado
                      </Badge>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://github.com/${profile.github_username}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver Perfil
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnectGitHub}
                      >
                        Desconectar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Github className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      GitHub não conectado
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Conecte sua conta do GitHub para sincronizar repositórios
                    </p>
                    <Button onClick={handleConnectGitHub}>
                      <Github className="w-4 h-4 mr-2" />
                      Conectar GitHub
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Preferências</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-gray-900 dark:text-white">
                        Notificações
                      </label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Receber notificações sobre sincronizações
                      </p>
                    </div>
                    <Switch
                      checked={formData.notifications_enabled}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, notifications_enabled: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-gray-900 dark:text-white">
                        Sincronização Automática
                      </label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Executar rotinas automaticamente
                      </p>
                    </div>
                    <Switch
                      checked={formData.auto_sync_enabled}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, auto_sync_enabled: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div>
                    <label className="block font-medium text-gray-900 dark:text-white mb-2">
                      Tipo de Sincronização Padrão
                    </label>
                    <select
                      value={formData.default_sync_type}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        default_sync_type: e.target.value as 'pull' | 'push' | 'bidirectional'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="pull">Pull (Baixar)</option>
                      <option value="push">Push (Enviar)</option>
                      <option value="bidirectional">Bidirecional</option>
                    </select>
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Salvando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Save className="w-4 h-4" />
                      <span>Salvar Alterações</span>
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Status da Conta</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                  <Badge className="bg-green-100 text-green-800">Ativa</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Plano</span>
                  <Badge variant="outline">Gratuito</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Membro desde</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {new Date(user?.created_at || '').toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Bell className="w-4 h-4 mr-2" />
                  Configurar Notificações
                </Button>
                
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Preferências Avançadas
                </Button>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400 flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Zona de Perigo</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showDeleteConfirm ? (
                  <Button
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Conta
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Esta ação não pode ser desfeita. Digite "DELETE" para confirmar:
                    </p>
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Digite DELETE"
                      className="border-red-300 dark:border-red-700"
                    />
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeleteConfirmText('')
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE'}
                      >
                        Excluir Conta
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <GitHubLoginModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        onSuccess={handleGitHubConnectionSuccess}
      />
    </div>
  )
}

export default Profile