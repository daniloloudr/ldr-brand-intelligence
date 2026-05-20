import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ user, onLogout, children }) {
  const [workspace, setWorkspace] = useState(null)
  const [role, setRole]           = useState(null)
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('workspace_members')
      .select('role, created_at, workspaces(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data?.workspaces) {
      setWorkspace(data.workspaces)
      setRole(data.role)
    }
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  return (
    <WorkspaceContext.Provider value={{ workspace, role, loading, reload: load, user, onLogout }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export const useWorkspace = () => useContext(WorkspaceContext)
