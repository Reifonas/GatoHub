import React, { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useSyncStore } from '../stores/syncStore'
import { useRoutineStore } from '../stores/routineStore'
import { AuthSection } from '../components/AuthSection'
import { SyncSection } from '../components/SyncSection'
import { RoutineSection } from '../components/RoutineSection'
import { LogsSection } from '../components/LogsSection'

const Dashboard: React.FC = () => {
  const { user } = useAuthStore()
  const { fetchRepositories, fetchSyncOperations, initializeRealTime: initSyncRealTime, cleanupRealTime: cleanupSyncRealTime } = useSyncStore()
  const { fetchRoutines, initializeRealTime: initRoutineRealTime, cleanupRealTime: cleanupRoutineRealTime } = useRoutineStore()

  useEffect(() => {
    // Always fetch data since we're always authenticated in single-user mode
    if (user) {
      // Fetch initial data
      fetchRepositories()
      fetchSyncOperations()
      fetchRoutines()
      
      // Initialize real-time subscriptions
      initSyncRealTime(user.id)
      initRoutineRealTime(user.id)
      
      // Cleanup on unmount or user change
      return () => {
        cleanupSyncRealTime()
        cleanupRoutineRealTime()
      }
    }
  }, [user, fetchRepositories, fetchSyncOperations, fetchRoutines, initSyncRealTime, initRoutineRealTime, cleanupSyncRealTime, cleanupRoutineRealTime])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Gatohub Sync Pro
          </h1>
          <p className="mt-2 text-gray-600">
            Sincronize seus repositórios GitHub com facilidade
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            <SyncSection />
            <RoutineSection />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <LogsSection />
          </div>
        </div>
      </div>
    </div>
  )
}

export { Dashboard }
export default Dashboard