import React, { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Terminal, X, Download } from 'lucide-react'

interface LogEntry {
  id: string
  type: string
  level: 'info' | 'error' | 'warning' | 'success'
  message: string
  operationId: string
  timestamp: string
}

interface RealTimeLogsProps {
  operationId: string
  onClose?: () => void
  className?: string
}

const RealTimeLogs: React.FC<RealTimeLogsProps> = ({ operationId, onClose, className }) => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Conectar ao SSE para logs em tempo real
    const connectToLogs = () => {
      const eventSource = new EventSource(`/api/sync/operations/${operationId}/logs`)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsConnected(true)
        console.log('Conectado aos logs em tempo real')
      }

      eventSource.onmessage = (event) => {
        try {
          const logData = JSON.parse(event.data)
          setLogs(prevLogs => {
            const newLogs = [...prevLogs, logData]
            // Manter apenas os últimos 100 logs para performance
            return newLogs.slice(-100)
          })
        } catch (error) {
          console.error('Erro ao processar log:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('Erro na conexão SSE:', error)
        setIsConnected(false)
        // Tentar reconectar após 3 segundos
        setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            connectToLogs()
          }
        }, 3000)
      }
    }

    connectToLogs()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [operationId])

  // Auto-scroll para o final quando novos logs chegam
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [logs])

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const exportLogs = () => {
    const logText = logs.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sync-logs-${operationId}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            <CardTitle className="text-lg">Logs em Tempo Real</CardTitle>
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={exportLogs}
              disabled={logs.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
            {onClose && (
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 w-full" ref={scrollAreaRef}>
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aguardando logs...</p>
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={`${log.id}-${index}`} className="flex items-start gap-2 p-2 rounded-md hover:bg-gray-50">
                  <Badge className={`text-xs ${getLevelColor(log.level)}`}>
                    {log.level.toUpperCase()}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono break-words">{log.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default RealTimeLogs