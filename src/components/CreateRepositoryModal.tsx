import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Switch } from './ui/switch'
import { Loader2, Github, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { githubService } from '../services/githubService'
import ConnectionLogService from '../services/connectionLogService'

interface CreateRepositoryModalProps {
  isOpen: boolean
  onClose: () => void
  onRepositoryCreated: (repository: any) => void
}

interface CreateRepoForm {
  name: string
  description: string
  private: boolean
  defaultBranch: string
  autoInit: boolean
  gitignoreTemplate: string
  license: string
}

const CreateRepositoryModal: React.FC<CreateRepositoryModalProps> = ({
  isOpen,
  onClose,
  onRepositoryCreated
}) => {
  const [form, setForm] = useState<CreateRepoForm>({
    name: '',
    description: '',
    private: false,
    defaultBranch: 'main',
    autoInit: true,
    gitignoreTemplate: '',
    license: ''
  })
  const [isCreating, setIsCreating] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Validação do nome do repositório
  const validateRepositoryName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Nome do repositório é obrigatório'
    }
    if (name.length < 1 || name.length > 100) {
      return 'Nome deve ter entre 1 e 100 caracteres'
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
      return 'Nome pode conter apenas letras, números, pontos, hífens e underscores'
    }
    if (name.startsWith('.') || name.startsWith('-')) {
      return 'Nome não pode começar com ponto ou hífen'
    }
    return null
  }

  const handleInputChange = (field: keyof CreateRepoForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    const nameError = validateRepositoryName(form.name)
    if (nameError) {
      newErrors.name = nameError
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateRepository = async () => {
    if (!validateForm()) {
      return
    }

    setIsCreating(true)
    try {
      // Criar repositório via API do GitHub
      const repoData = {
        name: form.name.trim(),
        description: form.description.trim() || undefined, // Usar descrição apenas se fornecida
        private: form.private,
        auto_init: form.autoInit,
        gitignore_template: form.gitignoreTemplate || undefined,
        license_template: form.license || undefined
      }

      const newRepository = await githubService.createRepository(repoData)
      
      // Registrar no log de conexão
      await ConnectionLogService.logConnection({
        type: 'repository_created',
        status: 'success',
        details: {
          repository_name: newRepository.name,
          repository_url: newRepository.html_url,
          private: newRepository.private,
          default_branch: form.defaultBranch
        }
      })

      toast.success(`Repositório '${newRepository.name}' criado com sucesso!`)
      
      // Notificar o componente pai sobre o novo repositório
      onRepositoryCreated(newRepository)
      
      // Resetar formulário e fechar modal
      setForm({
        name: '',
        description: '',
        private: false,
        defaultBranch: 'main',
        autoInit: true,
        gitignoreTemplate: '',
        license: ''
      })
      onClose()
      
    } catch (error: any) {
      console.error('Erro ao criar repositório:', error)
      
      // Registrar erro no log
      await ConnectionLogService.logConnection({
        type: 'repository_created',
        status: 'error',
        details: {
          repository_name: form.name,
          error: error.message
        }
      })
      
      toast.error(error.message || 'Erro ao criar repositório')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      setForm({
        name: '',
        description: '',
        private: false,
        defaultBranch: 'main',
        autoInit: true,
        gitignoreTemplate: '',
        license: ''
      })
      setErrors({})
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Github className="h-4 w-4" />
            Criar Novo Repositório
          </DialogTitle>
          <DialogDescription className="text-sm">
            Crie um novo repositório no GitHub que aparecerá automaticamente na lista de repositórios.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-2">
          {/* Grid para campos principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Nome do Repositório */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="repo-name" className="text-sm font-medium">Nome do Repositório *</Label>
              <Input
                id="repo-name"
                placeholder="meu-novo-repositorio"
                value={form.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`h-9 ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  {errors.name}
                </div>
              )}
            </div>

            {/* Visibilidade */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Visibilidade</Label>
              <Select
                value={form.private ? 'private' : 'public'}
                onValueChange={(value) => handleInputChange('private', value === 'private')}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">🌍 Público</SelectItem>
                  <SelectItem value="private">🔒 Privado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Branch Padrão */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Branch Padrão</Label>
              <Select
                value={form.defaultBranch}
                onValueChange={(value) => handleInputChange('defaultBranch', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">main</SelectItem>
                  <SelectItem value="master">master</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="repo-description" className="text-sm font-medium">Descrição</Label>
            <Textarea
              id="repo-description"
              placeholder="Descrição do repositório (opcional)"
              value={form.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>



          {/* Grid para opções avançadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Template .gitignore */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Template .gitignore</Label>
              <Select
                value={form.gitignoreTemplate}
                onValueChange={(value) => handleInputChange('gitignoreTemplate', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  <SelectItem value="Node">Node.js</SelectItem>
                  <SelectItem value="Python">Python</SelectItem>
                  <SelectItem value="Java">Java</SelectItem>
                  <SelectItem value="C++">C++</SelectItem>
                  <SelectItem value="Go">Go</SelectItem>
                  <SelectItem value="Rust">Rust</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Licença */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Licença</Label>
              <Select
                value={form.license}
                onValueChange={(value) => handleInputChange('license', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  <SelectItem value="mit">MIT License</SelectItem>
                  <SelectItem value="apache-2.0">Apache License 2.0</SelectItem>
                  <SelectItem value="gpl-3.0">GNU GPL v3</SelectItem>
                  <SelectItem value="bsd-3-clause">BSD 3-Clause</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Inicializar com README */}
          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Inicializar com README.md</Label>
              <p className="text-xs text-gray-500">Cria um arquivo README.md inicial</p>
            </div>
            <Switch
              checked={form.autoInit}
              onCheckedChange={(checked) => handleInputChange('autoInit', checked)}
            />
          </div>
        </div>

        <DialogFooter className="pt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
            className="h-9 px-4"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleCreateRepository}
            disabled={isCreating || !form.name.trim()}
            className="h-9 px-4"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Github className="mr-2 h-3 w-3" />
                Criar Repositório
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { CreateRepositoryModal }
export default CreateRepositoryModal