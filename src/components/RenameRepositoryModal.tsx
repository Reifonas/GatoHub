import React, { useState } from 'react'
import { X, Edit3, AlertCircle } from 'lucide-react'
import { githubService } from '../services/githubService'
import { toast } from 'sonner'

interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string
  private: boolean
  html_url: string
  clone_url: string
  ssh_url: string
  language: string
  stargazers_count: number
  forks_count: number
  updated_at: string
  created_at: string
  default_branch: string
}

interface RenameRepositoryModalProps {
  isOpen: boolean
  onClose: () => void
  repository: GitHubRepository | null
  onRepositoryRenamed: (updatedRepo: GitHubRepository) => void
}

export const RenameRepositoryModal: React.FC<RenameRepositoryModalProps> = ({
  isOpen,
  onClose,
  repository,
  onRepositoryRenamed
}) => {
  const [newName, setNewName] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [error, setError] = useState('')

  React.useEffect(() => {
    if (isOpen && repository) {
      setNewName(repository.name)
      setError('')
    }
  }, [isOpen, repository])

  const validateName = (name: string): boolean => {
    if (!name.trim()) {
      setError('Nome do repositório é obrigatório')
      return false
    }

    if (name.length > 100) {
      setError('Nome do repositório deve ter no máximo 100 caracteres')
      return false
    }

    // Validação básica de nome do GitHub
    const validNameRegex = /^[a-zA-Z0-9._-]+$/
    if (!validNameRegex.test(name)) {
      setError('Nome deve conter apenas letras, números, pontos, hífens e underscores')
      return false
    }

    if (name === repository?.name) {
      setError('O novo nome deve ser diferente do atual')
      return false
    }

    setError('')
    return true
  }

  const handleRename = async () => {
    if (!repository || !validateName(newName.trim())) {
      return
    }

    setIsRenaming(true)
    try {
      // Extract owner from full_name (format: owner/repo)
      const owner = repository.full_name.split('/')[0]
      const updatedRepo = await githubService.renameRepository(
        owner,
        repository.name,
        newName.trim()
      )

      toast.success(`Repositório renomeado para "${newName.trim()}" com sucesso!`)
      onRepositoryRenamed(updatedRepo)
      onClose()
    } catch (error: any) {
      console.error('Erro ao renomear repositório:', error)
      setError(error.message || 'Erro ao renomear repositório')
      toast.error('Falha ao renomear repositório')
    } finally {
      setIsRenaming(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewName(value)
    if (error) {
      validateName(value)
    }
  }

  if (!isOpen || !repository) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Renomear Repositório
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isRenaming}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Repositório atual: <span className="font-medium">{repository.name}</span>
            </p>
            <p className="text-xs text-gray-500">
              Atenção: Renomear um repositório pode quebrar links existentes.
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="newName" className="block text-sm font-medium text-gray-700 mb-2">
              Novo nome do repositório
            </label>
            <input
              id="newName"
              type="text"
              value={newName}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Digite o novo nome"
              disabled={isRenaming}
              autoFocus
            />
            {error && (
              <div className="mt-2 flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            disabled={isRenaming}
          >
            Cancelar
          </button>
          <button
            onClick={handleRename}
            disabled={isRenaming || !!error || !newName.trim() || newName === repository.name}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRenaming ? 'Renomeando...' : 'Renomear'}
          </button>
        </div>
      </div>
    </div>
  )
}