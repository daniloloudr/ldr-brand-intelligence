import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ user, onLogout, children, overrideWorkspaceId }) {
  const [workspace, setWorkspace] = useState(null)
  const [role, setRole]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const carregouRef = useRef(false)

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }
    // loading=true só no PRIMEIRO load: o AppShell desmonta a árvore inteira no
    // loading, então um reload() de rotina (ex.: saldo de créditos após gerar)
    // piscava a tela e matava o polling do canvas — refresh seguinte é silencioso.
    if (!carregouRef.current) setLoading(true)

    if (overrideWorkspaceId) {
      // Admin impersonando: carrega workspace diretamente por ID
      const { data } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', overrideWorkspaceId)
        .single()
      if (data) { setWorkspace(data); setRole('admin') }
    } else {
      const { data } = await supabase
        .from('workspace_members')
        .select('role, created_at, workspaces(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (data?.workspaces) { setWorkspace(data.workspaces); setRole(data.role) }
    }

    carregouRef.current = true
    setLoading(false)
  }, [user?.id, overrideWorkspaceId])

  useEffect(() => { load() }, [load])

  return (
    <WorkspaceContext.Provider value={{ workspace, role, loading, reload: load, user, onLogout }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export const useWorkspace = () => useContext(WorkspaceContext)
