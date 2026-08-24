import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import { getTenantSlug } from './helpers'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ user, onLogout, children, overrideWorkspaceId }) {
  const [workspace, setWorkspace] = useState(null)
  const [role, setRole]           = useState(null)
  // Capacidades do usuário NESTE workspace (migration 052). Ficam ao lado do
  // papel porque toda tela que pergunta "posso aprovar?" já tem o contexto na
  // mão — sem isto, cada página refaria a mesma query.
  //
  // A RLS é o perímetro real; isto aqui é a UI, e UI se contorna. Nenhuma
  // decisão de acesso pode depender só deste objeto.
  const [capacidades, setCapacidades] = useState({ pode_aprovar_pecas: false, pode_aprovar_aprendizado: false })
  const [loading, setLoading]     = useState(true)
  const [denied, setDenied]       = useState(false)   // logado, mas não é membro deste tenant
  const carregouRef = useRef(false)

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }
    // loading=true só no PRIMEIRO load: o AppShell desmonta a árvore inteira no
    // loading, então um reload() de rotina (ex.: saldo de créditos após gerar)
    // piscava a tela e matava o polling do canvas — refresh seguinte é silencioso.
    if (!carregouRef.current) setLoading(true)

    const tenantSlug = getTenantSlug()   // subdomínio da marca (ou ?tenant= em dev)

    if (overrideWorkspaceId) {
      // Admin impersonando: carrega workspace diretamente por ID
      const { data } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', overrideWorkspaceId)
        .single()
      // Operador impersonando: entra como dono, porque é o que ele é para fins
      // de suporte. `owner` substituiu `admin` na 052.
      if (data) {
        setWorkspace(data); setRole('owner'); setDenied(false)
        setCapacidades({ pode_aprovar_pecas: true, pode_aprovar_aprendizado: true })
      }
    } else if (tenantSlug) {
      // Subdomínio do tenant: resolve pelo slug E exige associação (RLS = perímetro).
      // Uma query só: membership do user com join no workspace filtrado por slug.
      // Tolera banco pré-052. Entre o deploy do código e a migration existe uma
      // janela; `select` de coluna que ainda não existe não degrada — o
      // PostgREST recusa a query INTEIRA, e aqui isso significa "você não é
      // membro desta marca" para todo mundo, em todos os tenants. Uma release
      // não pode depender de alguém acertar a ordem do deploy às 22h.
      const buscar = (campos) => supabase
        .from('workspace_members')
        .select(campos)
        .eq('user_id', user.id)
        .eq('workspaces.slug', tenantSlug)
        .maybeSingle()

      let { data, error } = await buscar('role, pode_aprovar_pecas, pode_aprovar_aprendizado, workspaces!inner(*)')
      if (error) ({ data } = await buscar('role, workspaces!inner(*)'))

      if (data?.workspaces) {
        // Pré-052 o papel do dono se chamava 'admin' e as capacidades não
        // existiam: derivam do papel, igual ao backfill da migration.
        const dono = data.role === 'owner' || data.role === 'admin'
        setWorkspace(data.workspaces); setRole(dono ? 'owner' : 'member'); setDenied(false)
        setCapacidades({
          pode_aprovar_pecas:       data.pode_aprovar_pecas       ?? dono,
          pode_aprovar_aprendizado: data.pode_aprovar_aprendizado ?? dono,
        })
      }
      else { setWorkspace(null); setDenied(true) }   // não é membro desta marca
    } else {
      // Domínio de sistema (app./localhost): NÃO carrega workspace por associação.
      // app.br4ndcode.com é exclusivo do admin; aqui só se entra num workspace via
      // impersonação (overrideWorkspaceId). Sem override = sem marca (o App.jsx já
      // roteia pra fora deste caminho; isto é rede de segurança).
      setWorkspace(null); setRole(null); setDenied(true)
      setCapacidades({ pode_aprovar_pecas: false, pode_aprovar_aprendizado: false })
    }

    carregouRef.current = true
    setLoading(false)
  }, [user?.id, overrideWorkspaceId])

  useEffect(() => { load() }, [load])

  return (
    <WorkspaceContext.Provider value={{
      workspace, role, loading, denied, reload: load, user, onLogout,
      ehOwner: role === 'owner',
      podeAprovarPecas: capacidades.pode_aprovar_pecas,
      podeAprovarAprendizado: capacidades.pode_aprovar_aprendizado,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export const useWorkspace = () => useContext(WorkspaceContext)
