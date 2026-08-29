import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import { getTenantSlug, ehAmbienteLocal } from './helpers'
import { abrirSessaoSuporte, sessaoSuporteViva } from './sessaoSuporte'

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
      else {
        // ── ATALHO DE DESENVOLVIMENTO ────────────────────────────────
        // `?tenant=<slug>` em localhost, para quem opera a plataforma. Pedido
        // do Danilo (26/08): em ambiente local ele precisa abrir qualquer
        // marca para acompanhar setup, testar e implementar — sem virar membro
        // do tenant do cliente, que anda contra a separação do super admin (S1).
        //
        // O caso que motivou: a Zétona nasceu sem ele na lista de membros, e
        // `?tenant=zetona` respondia "Sem acesso a esta marca" — corretamente,
        // porque o caminho do subdomínio exige participação.
        //
        // DUAS travas, e as duas precisam valer:
        //  · HOST local — `getTenantSlug` aceita `?tenant=` em qualquer host,
        //    então sem isto o atalho seria um trocador de tenant por URL em
        //    PRODUÇÃO, e ainda por cima sem a tarja de impersonação na tela;
        //  · `platform_admins` — a lista real, lida do banco (a policy "admin
        //    le proprio registro" permite ao usuário ver a própria linha).
        //
        // A trava que vale mesmo não está aqui: é a RLS. Sem linha em
        // platform_admins o bypass do 007 não se aplica e as telas vêm vazias
        // de qualquer jeito. Isto é conveniência de UI sobre uma permissão que
        // o banco JÁ concede — nunca a permissão em si.
        const { data: operador } = ehAmbienteLocal()
          ? await supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle()
          : { data: null }

        const { data: ws } = operador
          ? await supabase.from('workspaces').select('*').eq('slug', tenantSlug).maybeSingle()
          : { data: null }

        if (ws) {
          // A 053 fechou o conteúdo do cliente para quem não declarou a
          // intenção. Sem abrir a sessão aqui, `?tenant=` passa a montar o app
          // inteiro e VAZIO — o pior resultado possível, porque parece perda de
          // dado do cliente e não falta de permissão.
          //
          // Consulta antes de abrir: `load()` roda de novo a cada reload de
          // rotina (saldo de crédito, polling do canvas), e abrir a cada vez
          // encheria a trilha de auditoria de linhas que não são acessos novos.
          const viva = await sessaoSuporteViva(ws.id)
          const sessao = viva || await abrirSessaoSuporte(ws.id, 'operação local pelo atalho ?tenant=', {
            minutos: 60, origem: 'tenant-local',
          }).catch(() => null)

          // Sem sessão, NÃO montar o app. A tentação é seguir e deixar a tela
          // explicar sozinha — mas o que ela explica é "este cliente não tem
          // dado", porque toda consulta volta vazia. Preferir o "sem acesso",
          // que é verdade, ao app inteiro em branco, que é mentira.
          if (!sessao) {
            setWorkspace(null); setDenied(true)
            carregouRef.current = true; setLoading(false)
            return
          }

          // Mesmo tratamento da impersonação: para fins de suporte, o operador
          // é dono. Papel de tela, não de banco — ele não entra em
          // workspace_members.
          setWorkspace(ws); setRole('owner'); setDenied(false)
          setCapacidades({ pode_aprovar_pecas: true, pode_aprovar_aprendizado: true })
        } else {
          setWorkspace(null); setDenied(true)   // não é membro desta marca
        }
      }
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
