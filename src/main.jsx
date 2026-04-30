import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { CalendarDays, Eye, Gauge, LogOut, Settings, Trophy, UserRound, Users, Vote, Shield, Flag, ListChecks, ChevronRight, BarChart3, Clock, Ban, Unlock, Trash2 } from 'lucide-react';
import './style.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const FLAG_BASE = 'https://flagcdn.com/w40/';
const flagSrc = (code) => code ? `${FLAG_BASE}${code}.png` : '';

function normalizaStatus(status, jogo) {
  if (status) return status;
  const temResultado = jogo?.gols_a !== null && jogo?.gols_a !== undefined && jogo?.gols_b !== null && jogo?.gols_b !== undefined;
  return temResultado ? 'FINALIZADO' : 'AGUARDANDO';
}
function statusInfo(status) {
  const s = status || 'AGUARDANDO';
  if (s === 'EM_ANDAMENTO') return { label: 'Ao vivo', cls: 'live' };
  if (s === 'FINALIZADO') return { label: 'Finalizado', cls: 'done' };
  return { label: 'Aguardando', cls: 'waiting' };
}
function jogoBloqueadoParaPalpite(jogo, fechadoGlobal) {
  return fechadoGlobal || normalizaStatus(jogo.status, jogo) !== 'AGUARDANDO';
}


function calcPoints(jogo, palpite) {
  if (jogo.gols_a === null || jogo.gols_a === undefined || jogo.gols_b === null || jogo.gols_b === undefined) return null;
  if (!palpite || palpite.palpite_a === null || palpite.palpite_a === undefined || palpite.palpite_b === null || palpite.palpite_b === undefined) return null;
  const RA = Number(jogo.gols_a), RB = Number(jogo.gols_b), PA = Number(palpite.palpite_a), PB = Number(palpite.palpite_b);
  if (PA === RA && PB === RB) return 5;
  if (RA === RB) return PA === PB ? 3 : 0;
  if (PA === PB) return 0;
  if ((RA > RB && PA === RA) || (RB > RA && PB === RB)) return 3;
  if ((RA > RB && PB === RB) || (RB > RA && PA === RA)) return 2;
  if ((RA > RB && PA > PB) || (RB > RA && PB > PA)) return 1;
  return 0;
}


function pointClass(pontos) {
  if (pontos === 5) return 'badge-points p5';
  if (pontos === 3) return 'badge-points p3';
  if (pontos === 2) return 'badge-points p2';
  if (pontos === 1) return 'badge-points p1';
  if (pontos === 0) return 'badge-points p0';
  return 'badge-points pending';
}

function pointReason(jogo, palpite) {
  const pts = calcPoints(jogo, palpite);
  if (pts === null) return 'Aguardando resultado';
  if (pts === 5) return 'Placar exato';
  if (pts === 3) {
    if (Number(jogo.gols_a) === Number(jogo.gols_b)) return 'Empate correto';
    return 'Gols do vencedor';
  }
  if (pts === 2) return 'Gols do perdedor';
  if (pts === 1) return 'Vencedor indicado';
  return 'Sem pontuação';
}

function medal(i) {
  if (i === 0) return '🥇';
  if (i === 1) return '🥈';
  if (i === 2) return '🥉';
  return `${i + 1}º`;
}

function fmtDate(v) {
  if (!v) return 'Data a definir';
  try { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(v)); } catch { return v; }
}
function fmtDay(v) {
  if (!v) return 'Data a definir';
  try { return new Intl.DateTimeFormat('pt-BR', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric', timeZone:'America/Sao_Paulo' }).format(new Date(v)); } catch { return v; }
}
function dayKey(v) {
  if (!v) return 'sem-data';
  return new Intl.DateTimeFormat('sv-SE', { timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date(v));
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const show = (msg) => { setToast(msg); setTimeout(() => setToast(''), 5500); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadProfile() {
      if (!session?.user) { setProfile(null); return; }
      const { data, error } = await supabase.from('participantes').select('*').eq('id', session.user.id).maybeSingle();
      if (error) show(`Erro ao carregar perfil: ${error.message}`);
      if (!data || data.ativo === false || data.deleted_at) {
        setProfile(null);
        show('Seu acesso ao bolão foi bloqueado ou removido.');
        await supabase.auth.signOut();
        return;
      }
      setProfile(data);
    }
    loadProfile();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user) return;
    const checkUserStatus = async () => {
      const { data } = await supabase.from('participantes').select('ativo,deleted_at').eq('id', session.user.id).maybeSingle();
      if (!data || data.ativo === false || data.deleted_at) {
        show('Seu acesso foi bloqueado ou removido pelo administrador.');
        await supabase.auth.signOut();
      }
    };
    checkUserStatus();
    const timer = setInterval(checkUserStatus, 30000);
    const onFocus = () => checkUserStatus();
    const onVisibility = () => { if (!document.hidden) checkUserStatus(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [session?.user?.id]);

  if (loading) return <div className="center">Carregando...</div>;
  if (!supabaseUrl || !supabaseKey) return <div className="center error">Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na Vercel.</div>;
  if (!session) return <Auth show={show} />;

  const isAdmin = profile?.perfil === 'admin';

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><Trophy/> <span>Bolão da Copa 2026</span></div>
      <NavItem icon={<Gauge/>} active={view==='dashboard'} onClick={()=>setView('dashboard')}>Dashboard</NavItem>
      <NavItem icon={<UserRound/>} active={view==='perfil'} onClick={()=>setView('perfil')}>Meu Perfil</NavItem>
      <NavItem icon={<Vote/>} active={view==='meus'} onClick={()=>setView('meus')}>Meus Palpites</NavItem>
      <NavItem icon={<Eye/>} active={view==='ver'} onClick={()=>setView('ver')}>Ver Palpites</NavItem>
      <NavItem icon={<CalendarDays/>} active={view==='calendario'} onClick={()=>setView('calendario')}>Calendário</NavItem>
      <NavItem icon={<ListChecks/>} active={view==='ranking'} onClick={()=>setView('ranking')}>Ranking</NavItem>
      {isAdmin && <NavItem icon={<Settings/>} active={view==='admin'} onClick={()=>setView('admin')}>Administração</NavItem>}
      <button className="logout" onClick={()=>supabase.auth.signOut()}><LogOut size={18}/> Sair</button>
    </aside>
    <main className="content">
      <header className="topbar"><div><h1>{titleFor(view)}</h1><p>{view === "dashboard" ? "Jogos por data, ranking e estatísticas" : (profile?.nome || session.user.email)}</p></div><div className="user-pill"><span>{initials(profile?.nome || session.user.email)}</span><strong>Olá, {profile?.nome || session.user.email}</strong></div>{toast && <div className="toast">{toast}</div>}</header>
      {view === 'dashboard' && <Dashboard user={session.user} profile={profile} show={show} goRanking={()=>setView('ranking')}/>} 
      {view === 'perfil' && <MeuPerfil user={session.user} profile={profile} setProfile={setProfile} show={show}/>} 
      {view === 'meus' && <MeusPalpites user={session.user} profile={profile} show={show}/>} 
      {view === 'ver' && <VerPalpites show={show}/>} 
      {view === 'calendario' && <Calendario show={show}/>} 
      {view === 'ranking' && <Ranking show={show}/>} 
      {view === 'admin' && isAdmin && <Admin show={show}/>} 
    </main>
  </div>
}

function titleFor(v){ return ({dashboard:'Dashboard', perfil:'Meu Perfil', meus:'Meus Palpites', ver:'Ver Palpites', calendario:'Calendário de Jogos', ranking:'Ranking', admin:'Administração'})[v] || 'Bolão'; }
function NavItem({children, icon, active, onClick}){ return <button className={`nav ${active?'active':''}`} onClick={onClick}>{icon}{children}</button> }

function Auth({show}) {
  const params = new URLSearchParams(window.location.search);
  const abrirCadastro = params.get('cadastro') === '1';

  const [isLogin, setIsLogin] = useState(!abrirCadastro);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('');

  const mensagem = (tipo, texto) => {
    setStatusType(tipo);
    setStatusMsg(texto);
    setTimeout(() => {
      setStatusMsg('');
      setStatusType('');
    }, 7000);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setStatusMsg('');

    const nomeLimpo = nome.trim();
    const telefoneLimpo = telefone.trim();
    const emailLimpo = email.trim().toLowerCase();

    if (!isLogin && telefoneLimpo.length < 10) {
      setBusy(false);
      mensagem('erro', 'Informe um telefone/WhatsApp válido. Exemplo: +55 21 98199-1848');
      return;
    }

    const res = isLogin
      ? await supabase.auth.signInWithPassword({ email: emailLimpo, password })
      : await supabase.auth.signUp({
          email: emailLimpo,
          password,
          options: {
            data: { nome: nomeLimpo, telefone: telefoneLimpo }
          }
        });

    setBusy(false);

    if (res.error) {
      mensagem('erro', res.error.message);
      return;
    }

    if (isLogin) {
      mensagem('sucesso', 'Login realizado com sucesso.');
      setPassword('');
      return;
    }

    mensagem('sucesso', 'Cadastro realizado com sucesso. Verifique seu e-mail caso a confirmação esteja ativada.');
    setNome('');
    setTelefone('');
    setEmail('');
    setPassword('');
    setIsLogin(true);
  };

  const reset = async () => {
    if (!email.trim()) {
      mensagem('erro', 'Informe seu e-mail para recuperar a senha.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    mensagem(error ? 'erro' : 'sucesso', error ? error.message : 'E-mail de recuperação enviado.');
  };

  return <div className="auth"><form onSubmit={submit} className="auth-card"><h1>Bolão da Copa 2026</h1><p>{isLogin?'Acesse sua conta':'Crie sua conta'}</p>{statusMsg && <div className={`auth-status ${statusType}`}>{statusMsg}</div>}{!isLogin && <><input placeholder="Nome completo" value={nome} onChange={e=>setNome(e.target.value)} required/><input placeholder="Telefone/WhatsApp (ex: +55 21 98199-1848)" value={telefone} onChange={e=>setTelefone(e.target.value)} required/></>}<input placeholder="E-mail" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><input placeholder="Senha" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/><button disabled={busy}>{busy?'Aguarde...':isLogin?'Entrar':'Cadastrar'}</button><button type="button" className="link" onClick={()=>{setIsLogin(!isLogin); setStatusMsg('');}}>{isLogin?'Criar conta':'Já tenho conta'}</button><button type="button" className="link" onClick={reset}>Esqueci minha senha</button><a className="link" href="/landing/">Voltar para página inicial</a></form></div>
}

async function fetchJogos(show){
  const { data, error } = await supabase.from('jogos_view').select('*').order('data_hora', { nullsFirst: false }).order('partida_numero');
  if (error) { show?.(`Erro ao carregar jogos: ${error.message}`); return []; }
  return (data || []).map(j => ({...j, status: normalizaStatus(j.status, j)}));
}

function GameCard({jogo, children}){
  const info = statusInfo(normalizaStatus(jogo.status, jogo));
  return <div className={`game-card status-${info.cls} ${info.cls === 'done' ? 'finished' : ''}`}>
    <div className="game-meta">
      <span>{jogo.partida_numero ? `Jogo ${jogo.partida_numero} · ` : ''}Grupo {jogo.grupo_nome || '-'}</span>
      <span>{fmtDate(jogo.data_hora)} BRT</span>
    </div>
    <div className={`status-pill ${info.cls}`}>{info.label}</div>
    <div className="match-row">
      <div className="team left">{jogo.a_bandeira && <img src={flagSrc(jogo.a_bandeira)} />}<strong>{jogo.time_a}</strong></div>
      {children}
      <div className="team right"><strong>{jogo.time_b}</strong>{jogo.b_bandeira && <img src={flagSrc(jogo.b_bandeira)} />}</div>
    </div>
    <div className="venue-line">{jogo.estadio && <span>{jogo.estadio}</span>}{jogo.cidade && <span>{jogo.cidade}</span>}</div>
  </div>
}


function MeuPerfil({user, profile, setProfile, show}){
  const [nome,setNome]=useState(profile?.nome || '');
  const [telefone,setTelefone]=useState(profile?.telefone || '');
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    setNome(profile?.nome || '');
    setTelefone(profile?.telefone || '');
  }, [profile?.nome, profile?.telefone]);

  async function salvarPerfil(){
    const nomeLimpo = nome.trim();
    const telefoneLimpo = telefone.trim();

    if(!nomeLimpo) return show('Informe seu nome completo.');
    if(!telefoneLimpo || telefoneLimpo.length < 10) return show('Informe um telefone/WhatsApp válido. Exemplo: +55 21 98199-1848');

    setSaving(true);
    const { data, error } = await supabase
      .from('participantes')
      .update({ nome: nomeLimpo, telefone: telefoneLimpo })
      .eq('id', user.id)
      .select('*')
      .maybeSingle();
    setSaving(false);

    if(error) return show(`Erro ao salvar perfil: ${error.message}`);
    setProfile(data);
    show('Perfil atualizado com sucesso.');
  }

  return <section className="panel profile-panel">
    <div className="panel-head"><div><h3>Meu Perfil</h3><p>Confira seus dados. O telefone será usado para contato e confirmação do Pix.</p></div></div>
    <div className="form-grid">
      <label className="field-label"><span>Nome completo</span><input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Nome completo" /></label>
      <label className="field-label"><span>E-mail</span><input value={profile?.email || user.email || ''} disabled /></label>
      <label className="field-label"><span>Telefone/WhatsApp</span><input value={telefone} onChange={e=>setTelefone(e.target.value)} placeholder="+55 21 98199-1848" /></label>
      <div className="profile-actions"><button onClick={salvarPerfil} disabled={saving}>{saving?'Salvando...':'Salvar Perfil'}</button></div>
    </div>
    <div className="score-help">Para alterar e-mail, solicite ao administrador. O e-mail também está vinculado ao login do Supabase.</div>
  </section>
}

function MeusPalpites({user, profile, show}){
  const [jogos, setJogos] = useState([]); const [palpites, setPalpites] = useState({}); const [config, setConfig] = useState(null); const [saving,setSaving]=useState(false);
  useEffect(()=>{ load(); }, []);
  async function load(){
    setJogos(await fetchJogos(show));
    const { data: cfg } = await supabase.from('configuracao_bolao').select('*').eq('id',1).maybeSingle(); setConfig(cfg);
    const { data, error } = await supabase.from('palpites').select('*').eq('participante_id', user.id);
    if (error) show(`Erro ao carregar palpites: ${error.message}`); else setPalpites(Object.fromEntries((data||[]).map(p=>[p.jogo_id,p])));
  }
  const fechadoGlobal = (profile?.ativo === false) || (config?.limite_palpite ? new Date() > new Date(config.limite_palpite) : false);
  const setVal = (jogoId, k, v) => setPalpites(p => ({...p, [jogoId]: {...(p[jogoId]||{}), jogo_id:jogoId, participante_id:user.id, [k]: v === '' ? null : Number(v)}}));
  const saveAll = async () => {
    const abertos = jogos
      .filter(j => !jogoBloqueadoParaPalpite(j, fechadoGlobal))
      .map(j => j.id);

    const rows = Object.values(palpites)
      .filter(p =>
        abertos.includes(p.jogo_id) &&
        p.palpite_a !== null &&
        p.palpite_a !== undefined &&
        p.palpite_b !== null &&
        p.palpite_b !== undefined
      )
      .map(p => ({
        participante_id: p.participante_id || user.id,
        jogo_id: p.jogo_id,
        palpite_a: p.palpite_a,
        palpite_b: p.palpite_b
      }));

    if (!rows.length) {
      return show(fechadoGlobal ? 'Prazo geral de palpites encerrado.' : 'Nenhum palpite aberto para salvar.');
    }

    setSaving(true);

    const { error } = await supabase
      .from('palpites')
      .upsert(rows, { onConflict: 'participante_id,jogo_id' });

    setSaving(false);

    if (error) {
      show(`Erro ao salvar: ${error.message}`);
      return;
    }

    show('Palpites salvos com sucesso.');
    load();
  };
  return <section>
    <div className="toolbar sticky-actions"><span>{fechadoGlobal?'🔒 Prazo geral encerrado':`🟢 Palpites abertos até ${fmtDate(config?.limite_palpite)} BRT`}</span><button onClick={saveAll} disabled={saving}>{saving?'Salvando...':'Salvar Palpites'}</button></div>
    {jogos.map(j=>{ const p = palpites[j.id] || {}; const pts = calcPoints(j,p); const bloqueado = jogoBloqueadoParaPalpite(j, fechadoGlobal); return <GameCard key={j.id} jogo={j}>
      <div className="scorebox"><input disabled={bloqueado} type="number" min="0" value={p.palpite_a ?? ''} onChange={e=>setVal(j.id,'palpite_a',e.target.value)} /><span>x</span><input disabled={bloqueado} type="number" min="0" value={p.palpite_b ?? ''} onChange={e=>setVal(j.id,'palpite_b',e.target.value)} /></div>
      <div className="result-line card-details"><span>Oficial: <strong>{j.gols_a ?? '—'} x {j.gols_b ?? '—'}</strong></span><span className={pointClass(pts)}>{pts === null ? (bloqueado ? 'Bloqueado' : 'Aguardando') : `+${pts} pts`}</span><small>{bloqueado && pts === null ? 'Palpite bloqueado para esta partida' : pointReason(j,p)}</small></div>
    </GameCard>})}
  </section>
}

function VerPalpites({show}){
  const [users,setUsers]=useState([]), [selected,setSelected]=useState(''), [jogos,setJogos]=useState([]), [palpites,setPalpites]=useState({});
  useEffect(()=>{(async()=>{ const {data:us}=await supabase.from('participantes').select('*').eq('ativo', true).is('deleted_at', null).order('nome'); setUsers(us||[]); if(us?.[0]) setSelected(us[0].id); setJogos(await fetchJogos(show)); })()},[]);
  useEffect(()=>{ if(!selected) return; (async()=>{ const {data,error}=await supabase.from('palpites').select('*').eq('participante_id',selected); if(error) show(error.message); else setPalpites(Object.fromEntries((data||[]).map(p=>[p.jogo_id,p]))); })(); },[selected]);
  return <section><div className="toolbar participant-picker"><label>Participante</label><select value={selected} onChange={e=>setSelected(e.target.value)}>{users.map(u=><option key={u.id} value={u.id}>{u.nome || u.email}</option>)}</select></div>{jogos.map(j=>{ const p=palpites[j.id]; const pts=calcPoints(j,p); return <GameCard key={j.id} jogo={j}><div className="scorebox read"><span>{p?.palpite_a ?? '—'}</span><span>x</span><span>{p?.palpite_b ?? '—'}</span></div><div className="result-line card-details"><span>Oficial: <strong>{j.gols_a ?? '—'} x {j.gols_b ?? '—'}</strong></span><span className={pointClass(pts)}>{pts === null ? 'Aguardando' : `+${pts} pts`}</span><small>{pointReason(j,p)}</small></div></GameCard>})}</section>
}

function Calendario({show}){
  const [jogos,setJogos]=useState([]); useEffect(()=>{fetchJogos(show).then(setJogos)},[]);
  const gruposPorData = useMemo(() => jogos.reduce((acc,j)=>{ const k=dayKey(j.data_hora); (acc[k] ||= []).push(j); return acc; },{}), [jogos]);
  const datas = Object.keys(gruposPorData).sort();
  return <section>{jogos.length===0 && <Empty msg="Nenhum jogo cadastrado."/>}{datas.map(data=><div className="date-group" key={data}><h2>{fmtDay(gruposPorData[data][0]?.data_hora)}</h2>{gruposPorData[data].map(j=><GameCard key={j.id} jogo={j}><div className="scorebox read official"><span>{j.gols_a ?? '—'}</span><span>x</span><span>{j.gols_b ?? '—'}</span></div><div className="result-line">{statusInfo(j.status).label}</div></GameCard>)}</div>)}</section>
}

function buildRanking(users, pals, jogos){
  const byGame = Object.fromEntries((jogos || []).map(j => [j.id, j]));
  return (users || []).filter(u => u.ativo !== false && !u.deleted_at).map(u => {
    const ps = (pals || []).filter(p => p.participante_id === u.id);
    const scored = ps.map(p => calcPoints(byGame[p.jogo_id], p)).filter(v => v !== null);
    const pontos = scored.reduce((s, v) => s + (v || 0), 0);
    const naMosca = scored.filter(v => v === 5).length;
    const p3 = scored.filter(v => v === 3).length;
    const p2 = scored.filter(v => v === 2).length;
    const p1 = scored.filter(v => v === 1).length;
    const jogosPontuados = scored.filter(v => v > 0).length;
    const jogosDisputados = scored.length;
    const aproveitamento = jogosDisputados ? Math.round((pontos / (jogosDisputados * 5)) * 1000) / 10 : 0;
    return {...u, pontos, naMosca, p3, p2, p1, jogosPontuados, jogosDisputados, aproveitamento};
  }).sort((a,b) =>
    b.pontos - a.pontos ||
    b.naMosca - a.naMosca ||
    b.p3 - a.p3 ||
    b.p2 - a.p2 ||
    b.p1 - a.p1 ||
    (a.nome || a.email || '').localeCompare(b.nome || b.email || '')
  );
}

function initials(nameOrEmail){
  const base = (nameOrEmail || 'U').trim();
  const parts = base.replace(/@.*/, '').split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || 'U') + (parts[1]?.[0] || '')).toUpperCase();
}

function Ranking({show}){
  const [rows,setRows]=useState([]); useEffect(()=>{load()},[]);
  async function load(){
    const jogos = await fetchJogos(show);
    const {data: users}=await supabase.from('participantes').select('*').eq('ativo', true).is('deleted_at', null);
    const {data: pals,error}=await supabase.from('palpites').select('*'); if(error) return show(error.message);
    setRows(buildRanking(users || [], pals || [], jogos));
  }
  return <div className="ranking-list enhanced-ranking">{rows.map((r,i)=><div className={`ranking-card ${i===0?'leader':''}`} key={r.id}><div className="ranking-pos">{medal(i)}</div><div className="ranking-name"><strong>{r.nome || r.email}</strong><span>Na mosca: {r.naMosca} · 3 pts: {r.p3} · 2 pts: {r.p2} · 1 pt: {r.p1}</span></div><div className="ranking-score">{r.pontos}<small>pts</small></div></div>)}</div>
}

function Dashboard({show, user, profile, goRanking}){
  const [jogos,setJogos]=useState([]);
  const [palpites,setPalpites]=useState({});
  const [config,setConfig]=useState(null);
  const [users,setUsers]=useState([]);
  const [allPalpites,setAllPalpites]=useState([]);
  const [filter,setFilter]=useState('TODOS');
  const [saving,setSaving]=useState(false);

  const premiacao = calcularPremiacao(
    users.length,
    config?.valor_participacao || 20,
    config?.percentual_operacional || 10
  );

  useEffect(()=>{ load(); }, []);
  async function load(){
    const js = await fetchJogos(show);
    setJogos(js);

    const { data: cfg } = await supabase.from('configuracao_bolao').select('*').eq('id',1).maybeSingle();
    setConfig(cfg);

    const { data: meus } = await supabase.from('palpites').select('*').eq('participante_id', user.id);
    setPalpites(Object.fromEntries((meus||[]).map(p=>[p.jogo_id,p])));

    const { data: us } = await supabase.from('participantes')
      .select('*')
      .eq('ativo', true)
      .is('deleted_at', null)
      .order('nome');

    setUsers(us || []);

    const { data: pals } = await supabase.from('palpites').select('*');
    setAllPalpites(pals || []);
  }

  const fechadoGlobal = (profile?.ativo === false) || (config?.limite_palpite ? new Date() > new Date(config.limite_palpite) : false);

  const rankingRows = useMemo(()=>buildRanking(users, allPalpites, jogos), [users, allPalpites, jogos]);

  const myStats = rankingRows.find(r => r.id === user.id) || {
    pontos:0, naMosca:0, p3:0, p2:0, p1:0,
    jogosDisputados:0, jogosPontuados:0, aproveitamento:0
  };

  const myPosition = Math.max(1, rankingRows.findIndex(r => r.id === user.id) + 1);

  const filteredJogos = useMemo(()=>jogos.filter(j=>{
    const status = normalizaStatus(j.status, j);
    if(filter === 'AGUARDANDO') return status === 'AGUARDANDO';
    if(filter === 'EM_ANDAMENTO') return status === 'EM_ANDAMENTO';
    if(filter === 'FINALIZADO') return status === 'FINALIZADO';
    return true;
  }), [jogos, filter]);

  const gruposPorData = useMemo(() =>
    filteredJogos.reduce((acc,j)=>{
      const k=dayKey(j.data_hora);
      (acc[k] ||= []).push(j);
      return acc;
    },{}),
  [filteredJogos]);

  const datas = Object.keys(gruposPorData).sort();

  const setVal = (jogoId, k, v) =>
    setPalpites(p => ({
      ...p,
      [jogoId]: {
        ...(p[jogoId]||{}),
        jogo_id:jogoId,
        participante_id:user.id,
        [k]: v === '' ? null : Number(v)
      }
    }));

  const saveOne = async (j) => {
    const p = palpites[j.id];

    if(jogoBloqueadoParaPalpite(j, fechadoGlobal))
      return show('Palpite bloqueado para esta partida.');

    if(!p || p.palpite_a == null || p.palpite_b == null)
      return show('Informe os dois placares.');

    const row = {
      participante_id: user.id,
      jogo_id: j.id,
      palpite_a: p.palpite_a,
      palpite_b: p.palpite_b
    };

    setSaving(true);

    const { error } = await supabase
      .from('palpites')
      .upsert([row], { onConflict:'participante_id,jogo_id' });

    setSaving(false);

    show(error ? `Erro: ${error.message}` : 'Palpite salvo.');

    if(!error) load();
  };

  return (
    <div className="cartola-page">

      {/* COLUNA PRINCIPAL */}
      <div className="main-column">

        <section className="page-banner">
          <div className="banner-title">
            <CalendarDays/>
            <div>
              <h2>Fase de Grupos</h2>
              <p>Participe e mostre que você entende de futebol!</p>
            </div>
          </div>

          <div className="deadline-box">
            <Clock size={22}/>
            <span>Limite dos palpites</span>
            <strong>{fmtDate(config?.limite_palpite)} BRT</strong>
          </div>
        </section>

        <div className="filter-tabs">
          {[
            ['TODOS','Todos'],
            ['AGUARDANDO','Aguardando'],
            ['EM_ANDAMENTO','Em andamento'],
            ['FINALIZADO','Finalizados']
          ].map(([id,label])=>(
            <button key={id}
              className={filter===id?'active':''}
              onClick={()=>setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {datas.map(data=>(
          <section className="date-block" key={data}>
            <h3>
              <CalendarDays size={17}/>
              {fmtDay(gruposPorData[data][0]?.data_hora)}
            </h3>

            {gruposPorData[data].map(j=>{
              const p = palpites[j.id] || {};
              const pts = calcPoints(j,p);
              const bloqueado = jogoBloqueadoParaPalpite(j, fechadoGlobal);
              const info = statusInfo(j.status);

              return (
                <div className={`match-card-wide status-${info.cls}`} key={j.id}>
                  <div className={`status-pill ${info.cls}`}>{info.label}</div>

                  <div className="wide-center">
                    <strong>
                      {j.grupo_nome ? `Grupo ${j.grupo_nome}` : 'Grupo'} - Jogo {j.partida_numero || j.id}
                    </strong>
                    <span>{fmtDate(j.data_hora)} BRT</span>
                  </div>

                  <div className="wide-match">
                    <div className="wide-team left">
                      {j.a_bandeira && <img src={flagSrc(j.a_bandeira)} />}
                      <strong>{j.time_a}</strong>
                    </div>

                    <div className="wide-score">
                      <input disabled={bloqueado} type="number" value={p.palpite_a ?? ''} onChange={e=>setVal(j.id,'palpite_a',e.target.value)} />
                      <span>x</span>
                      <input disabled={bloqueado} type="number" value={p.palpite_b ?? ''} onChange={e=>setVal(j.id,'palpite_b',e.target.value)} />
                    </div>

                    <div className="wide-team right">
                      {j.b_bandeira && <img src={flagSrc(j.b_bandeira)} />}
                      <strong>{j.time_b}</strong>
                    </div>
                  </div>

                  <div className="wide-footer">
                    <span>📍 {[j.estadio,j.cidade].filter(Boolean).join(' · ')}</span>
                    <span>Oficial: <b>{j.gols_a ?? '—'} x {j.gols_b ?? '—'}</b></span>
                    <span className={pointClass(pts)}>
                      {pts === null ? 'Aguardando' : `+${pts} pts`}
                    </span>
                    <button disabled={saving || bloqueado} onClick={()=>saveOne(j)}>
                      {bloqueado ? 'Bloqueado' : 'Salvar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </div>

      {/* COLUNA DIREITA */}
      <aside className="right-column">

        {/* 💰 NOVO CARD DE PREMIAÇÃO */}
        <section className="side-card">
          <div className="side-title">
            <span>💰 Premiação estimada</span>
          </div>

          <div className="stat-row">
            <span>Total arrecadado</span>
            <strong>R$ {premiacao.total.toFixed(2)}</strong>
          </div>

          <div className="stat-row">
            <span>Taxa operacional</span>
            <strong>R$ {premiacao.taxaValor.toFixed(2)}</strong>
          </div>

          <div className="stat-row">
            <span>Valor líquido</span>
            <strong>R$ {premiacao.liquido.toFixed(2)}</strong>
          </div>

          <hr/>

          <div className="stat-row"><span>🥇 1º lugar</span><strong>R$ {premiacao.primeiro.toFixed(2)}</strong></div>
          <div className="stat-row"><span>🥈 2º lugar</span><strong>R$ {premiacao.segundo.toFixed(2)}</strong></div>
          <div className="stat-row"><span>🥉 3º lugar</span><strong>R$ {premiacao.terceiro.toFixed(2)}</strong></div>
        </section>

        <RankingWidget rows={rankingRows} goRanking={goRanking}/>
        <StatsWidget stats={myStats} position={myPosition}/>
      </aside>

    </div>
  );
  
}

  useEffect(()=>{ load(); }, []);
  async function load(){
    const js = await fetchJogos(show);
    setJogos(js);
    const { data: cfg } = await supabase.from('configuracao_bolao').select('*').eq('id',1).maybeSingle(); setConfig(cfg);
    const { data: meus, error: eMeus } = await supabase.from('palpites').select('*').eq('participante_id', user.id);
    if(eMeus) show(eMeus.message); else setPalpites(Object.fromEntries((meus||[]).map(p=>[p.jogo_id,p])));
    const { data: us } = await supabase.from('participantes').select('*').eq('ativo', true).is('deleted_at', null).order('nome'); setUsers(us || []);
    const { data: pals } = await supabase.from('palpites').select('*'); setAllPalpites(pals || []);
  }

  const fechadoGlobal = (profile?.ativo === false) || (config?.limite_palpite ? new Date() > new Date(config.limite_palpite) : false);
  const rankingRows = useMemo(()=>buildRanking(users, allPalpites, jogos), [users, allPalpites, jogos]);
  const myStats = rankingRows.find(r => r.id === user.id) || {pontos:0, naMosca:0, p3:0, p2:0, p1:0, jogosDisputados:0, jogosPontuados:0, aproveitamento:0};
  const myPosition = Math.max(1, rankingRows.findIndex(r => r.id === user.id) + 1);

  const filteredJogos = useMemo(()=>jogos.filter(j=>{
    const status = normalizaStatus(j.status, j);
    if(filter === 'AGUARDANDO') return status === 'AGUARDANDO';
    if(filter === 'EM_ANDAMENTO') return status === 'EM_ANDAMENTO';
    if(filter === 'FINALIZADO') return status === 'FINALIZADO';
    return true;
  }), [jogos, filter]);
  const gruposPorData = useMemo(() => filteredJogos.reduce((acc,j)=>{ const k=dayKey(j.data_hora); (acc[k] ||= []).push(j); return acc; },{}), [filteredJogos]);
  const datas = Object.keys(gruposPorData).sort();

  const setVal = (jogoId, k, v) => setPalpites(p => ({...p, [jogoId]: {...(p[jogoId]||{}), jogo_id:jogoId, participante_id:user.id, [k]: v === '' ? null : Number(v)}}));
  const saveOne = async (j) => {
    const p = palpites[j.id];
    if(jogoBloqueadoParaPalpite(j, fechadoGlobal)) return show('Palpite bloqueado para esta partida.');
    if(!p || p.palpite_a === null || p.palpite_a === undefined || p.palpite_b === null || p.palpite_b === undefined) return show('Informe os dois placares.');

    const row = {
      participante_id: p.participante_id || user.id,
      jogo_id: p.jogo_id,
      palpite_a: p.palpite_a,
      palpite_b: p.palpite_b
    };

    setSaving(true);
    const { error } = await supabase.from('palpites').upsert([row], { onConflict:'participante_id,jogo_id' });
    setSaving(false);
    show(error ? `Erro ao salvar: ${error.message}` : 'Palpite salvo.');
    if(!error) load();
  };

    <div className="main-column">
      <section className="page-banner">
        <div className="banner-title"><CalendarDays/><div><h2>Fase de Grupos</h2><p>Participe e mostre que você entende de futebol!</p></div></div>
        <div className="deadline-box"><Clock size={22}/><span>Limite dos palpites</span><strong>{fmtDate(config?.limite_palpite)} BRT</strong></div>
      </section>
      <div className="filter-tabs">
        {[['TODOS','Todos'],['AGUARDANDO','Aguardando'],['EM_ANDAMENTO','Em andamento'],['FINALIZADO','Finalizados']].map(([id,label])=><button key={id} className={filter===id?'active':''} onClick={()=>setFilter(id)}>{label}</button>)}
      </div>
      {datas.map(data=><section className="date-block" key={data}>
        <h3><CalendarDays size={17}/>{fmtDay(gruposPorData[data][0]?.data_hora)}</h3>
        {gruposPorData[data].map(j=>{ const p = palpites[j.id] || {}; const pts = calcPoints(j,p); const bloqueado = jogoBloqueadoParaPalpite(j, fechadoGlobal); const info = statusInfo(j.status); return <div className={`match-card-wide status-${info.cls}`} key={j.id}>
          <div className={`status-pill ${info.cls}`}>{info.label}</div>
          <div className="wide-center"><strong>{j.grupo_nome ? `Grupo ${j.grupo_nome}` : 'Grupo'} - Jogo {j.partida_numero || j.id}</strong><span>{fmtDate(j.data_hora)} BRT</span></div>
          <div className="wide-match">
            <div className="wide-team left">{j.a_bandeira && <img src={flagSrc(j.a_bandeira)} />}<strong>{j.time_a}</strong></div>
            <div className="wide-score"><input disabled={bloqueado} type="number" min="0" value={p.palpite_a ?? ''} onChange={e=>setVal(j.id,'palpite_a',e.target.value)} placeholder="0"/><span>x</span><input disabled={bloqueado} type="number" min="0" value={p.palpite_b ?? ''} onChange={e=>setVal(j.id,'palpite_b',e.target.value)} placeholder="0"/></div>
            <div className="wide-team right">{j.b_bandeira && <img src={flagSrc(j.b_bandeira)} />}<strong>{j.time_b}</strong></div>
          </div>
          <div className="wide-footer"><span>📍 {[j.estadio,j.cidade].filter(Boolean).join(' · ') || 'Local a definir'}</span><span>Oficial: <b>{j.gols_a ?? '—'} x {j.gols_b ?? '—'}</b></span><span className={pointClass(pts)}>{pts === null ? (bloqueado ? 'Bloqueado' : 'Aguardando resultado') : `+${pts} pts`}</span><button disabled={saving || bloqueado} onClick={()=>saveOne(j)}>{bloqueado ? 'Bloqueado' : 'Salvar'}</button></div>
        </div>})}
      </section>)}
      {datas.length===0 && <Empty msg="Nenhum jogo encontrado para este filtro."/>}
    </div>
    <aside className="right-column">
      <RankingWidget rows={rankingRows} goRanking={goRanking}/>
      <StatsWidget stats={myStats} position={myPosition}/>
    </aside>
  </div>
}

function RankingWidget({rows, goRanking}){
  const top = rows.slice(0,3);
  const others = rows.slice(3,8);
  return <section className="side-card ranking-widget"><div className="side-title"><span>🏆 Ranking Geral</span><button onClick={goRanking}>Ver todos <ChevronRight size={15}/></button></div><div className="podium">{top.map((r,i)=><div className={`podium-item p${i+1}`} key={r.id}><div className="medal-badge">{i+1}</div><div className="avatar">{initials(r.nome || r.email)}</div><strong>{r.nome || r.email}</strong><span>{r.pontos} pts</span></div>)}</div><div className="ranking-mini">{others.map((r,i)=><div key={r.id}><span>{i+4}</span><strong>{r.nome || r.email}</strong><b>{r.pontos} pts</b></div>)}</div></section>
}
function StatsWidget({stats, position}){
  return <section className="side-card stats-widget"><div className="side-title"><span><BarChart3 size={18}/> Minhas Estatísticas</span></div><div className="stat-row"><span>Pontuação Geral</span><strong>{stats.pontos} pts</strong></div><div className="stat-row"><span>Posição</span><strong>{position}º lugar</strong></div><div className="stat-row"><span>Jogos apurados</span><strong>{stats.jogosDisputados}</strong></div><div className="stat-row"><span>Aproveitamento</span><strong>{stats.aproveitamento}%</strong></div><h4>Desempate (critérios)</h4><div className="tie-grid"><div className="tie exact"><span>Na mosca<br/><small>5 pts</small></span><strong>{stats.naMosca}</strong></div><div className="tie three"><span>3 pontos</span><strong>{stats.p3}</strong></div><div className="tie two"><span>2 pontos</span><strong>{stats.p2}</strong></div><div className="tie one"><span>1 ponto</span><strong>{stats.p1}</strong></div></div><div className="score-help">Critério: maior pontuação, depois mais Na mosca, 3 pts, 2 pts e 1 pt.</div></section>
}

function KPI({label,value}){ return <div className="kpi"><span>{label}</span><strong>{value}</strong></div> }
function Empty({msg}){ return <div className="empty">{msg}</div> }

function Admin({show}){
  const [tab,setTab]=useState('config');
  return <section><div className="admin-tabs"><button className={tab==='config'?'active':''} onClick={()=>setTab('config')}>Configuração</button><button className={tab==='selecoes'?'active':''} onClick={()=>setTab('selecoes')}>Seleções</button><button className={tab==='grupos'?'active':''} onClick={()=>setTab('grupos')}>Grupos</button><button className={tab==='jogos'?'active':''} onClick={()=>setTab('jogos')}>Jogos</button><button className={tab==='participantes'?'active':''} onClick={()=>setTab('participantes')}>Participantes</button></div>{tab==='config'&&<AdminConfig show={show}/>} {tab==='selecoes'&&<AdminSelecoes show={show}/>} {tab==='grupos'&&<AdminGrupos show={show}/>} {tab==='jogos'&&<AdminJogos show={show}/>} {tab==='participantes'&&<AdminParticipantes show={show}/>}</section>
}
function AdminConfig({show}){ const [cfg,setCfg]=useState({nome:'Copa 2026', total_selecoes:48,total_grupos:12,selecoes_por_grupo:4,limite_palpite:'2026-06-01T23:59'}); useEffect(()=>{supabase.from('configuracao_bolao').select('*').eq('id',1).maybeSingle().then(({data})=>data&&setCfg({...data, limite_palpite:data.limite_palpite?.slice(0,16)}))},[]); async function save(){ const {error}=await supabase.from('configuracao_bolao').upsert({...cfg,id:1,limite_palpite:new Date(cfg.limite_palpite).toISOString()}); show(error?error.message:'Configuração salva.'); } return <div className="panel form-grid"><input value={cfg.nome||''} onChange={e=>setCfg({...cfg,nome:e.target.value})} placeholder="Nome"/><input type="number" value={cfg.total_selecoes||0} onChange={e=>setCfg({...cfg,total_selecoes:+e.target.value})}/><input type="number" value={cfg.total_grupos||0} onChange={e=>setCfg({...cfg,total_grupos:+e.target.value})}/><input type="number" value={cfg.selecoes_por_grupo||0} onChange={e=>setCfg({...cfg,selecoes_por_grupo:+e.target.value})}/><input type="datetime-local" value={cfg.limite_palpite||''} onChange={e=>setCfg({...cfg,limite_palpite:e.target.value})}/><button onClick={save}>Salvar configuração</button></div> }
function AdminSelecoes({show}){ const [rows,setRows]=useState([]), [form,setForm]=useState({nome:'',codigo_bandeira:''}); const load=()=>supabase.from('selecoes').select('*').order('nome').then(({data,error})=>error?show(error.message):setRows(data||[])); useEffect(load,[]); async function add(){ const {error}=await supabase.from('selecoes').insert(form); show(error?error.message:'Seleção salva.'); setForm({nome:'',codigo_bandeira:''}); load(); } async function del(id){ if(!confirm('Excluir seleção?'))return; const {error}=await supabase.from('selecoes').delete().eq('id',id); show(error?error.message:'Excluída.'); load(); } return <div><div className="panel form-grid"><input placeholder="Nome" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/><input placeholder="Código bandeira (br, ar...)" value={form.codigo_bandeira} onChange={e=>setForm({...form,codigo_bandeira:e.target.value})}/><button onClick={add}>Adicionar seleção</button></div><div className="panel"><table><tbody>{rows.map(r=><tr key={r.id}><td>{r.codigo_bandeira&&<img className="flag" src={flagSrc(r.codigo_bandeira)}/>}</td><td>{r.nome}</td><td>{r.codigo_bandeira}</td><td><button className="danger" onClick={()=>del(r.id)}>Excluir</button></td></tr>)}</tbody></table></div></div> }
function AdminGrupos({show}){ const [grupos,setGrupos]=useState([]), [sel,setSel]=useState([]); const load=async()=>{ const {data:g,error}=await supabase.from('grupos').select('*, grupo_selecoes(selecao_id, selecoes(*))').order('ordem'); if(error) show(error.message); else setGrupos(g||[]); const {data:s}=await supabase.from('selecoes').select('*').order('nome'); setSel(s||[]); }; useEffect(()=>{load()},[]); async function gerar(){ const letters='ABCDEFGHIJKL'.split('').map((l,i)=>({nome:l,ordem:i+1})); const {error}=await supabase.from('grupos').upsert(letters,{onConflict:'nome'}); show(error?error.message:'Grupos gerados.'); load(); } async function add(grupo_id,selecao_id){ if(!selecao_id)return; const {error}=await supabase.from('grupo_selecoes').insert({grupo_id,selecao_id}); show(error?error.message:'Seleção adicionada.'); load(); } return <div><div className="toolbar"><button onClick={gerar}>Gerar grupos A-L</button></div>{grupos.map(g=><div className="panel" key={g.id}><h3>Grupo {g.nome}</h3><div className="chips">{g.grupo_selecoes?.map(gs=><span className="chip" key={gs.selecao_id}>{gs.selecoes?.nome}</span>)}</div><select onChange={e=>add(g.id,e.target.value)} defaultValue=""><option value="">Adicionar seleção...</option>{sel.map(s=><option value={s.id} key={s.id}>{s.nome}</option>)}</select></div>)}</div> }
function toInputDateTime(value){
  if(!value) return '';
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminJogos({show}){
  const [jogos,setJogos]=useState([]);
  const [grupos,setGrupos]=useState([]);
  const [sel,setSel]=useState([]);
  const [form,setForm]=useState({grupo_id:'',selecao_a_id:'',selecao_b_id:'',data_hora:'',estadio:'',cidade:''});
  const [edit,setEdit]=useState(null);

  const load=async()=>{
    setJogos(await fetchJogos(show));
    const {data:g,error:eg}=await supabase.from('grupos').select('*').order('ordem');
    if(eg) show(eg.message); else setGrupos(g||[]);
    const {data:s,error:es}=await supabase.from('selecoes').select('*').order('nome');
    if(es) show(es.message); else setSel(s||[]);
  };
  useEffect(()=>{load()},[]);

  async function add(){
    if(!form.grupo_id || !form.selecao_a_id || !form.selecao_b_id) return show('Informe grupo, seleção A e seleção B.');
    if(form.selecao_a_id === form.selecao_b_id) return show('Seleção A e B não podem ser iguais.');
    const row={...form,status:'AGUARDANDO',data_hora:form.data_hora?new Date(form.data_hora).toISOString():null};
    const {error}=await supabase.from('jogos').insert(row);
    show(error?error.message:'Jogo criado.');
    if(!error) setForm({grupo_id:'',selecao_a_id:'',selecao_b_id:'',data_hora:'',estadio:'',cidade:''});
    load();
  }
  async function del(id){ if(!confirm('Excluir jogo?'))return; const {error}=await supabase.from('jogos').delete().eq('id',id); show(error?error.message:'Jogo excluído.'); load(); }
  function openEdit(j){ setEdit({id:j.id,grupo_id:j.grupo_id||'',selecao_a_id:j.selecao_a_id||'',selecao_b_id:j.selecao_b_id||'',data_hora:toInputDateTime(j.data_hora),gols_a:j.gols_a??'',gols_b:j.gols_b??'',estadio:j.estadio||'',cidade:j.cidade||'',status:j.status||'AGUARDANDO'}); }
  async function saveEdit(){
    if(!edit.grupo_id || !edit.selecao_a_id || !edit.selecao_b_id) return show('Informe grupo, seleção A e seleção B.');
    if(String(edit.selecao_a_id) === String(edit.selecao_b_id)) return show('Seleção A e B não podem ser iguais.');
    const row={grupo_id:Number(edit.grupo_id),selecao_a_id:Number(edit.selecao_a_id),selecao_b_id:Number(edit.selecao_b_id),data_hora:edit.data_hora?new Date(edit.data_hora).toISOString():null,gols_a:edit.gols_a===''?null:Number(edit.gols_a),gols_b:edit.gols_b===''?null:Number(edit.gols_b),estadio:edit.estadio||null,cidade:edit.cidade||null,status:edit.status||'AGUARDANDO'};
    const {error}=await supabase.from('jogos').update(row).eq('id',edit.id); show(error?error.message:'Jogo atualizado.'); if(!error) setEdit(null); load();
  }
  async function mudarStatus(id,status){ const patch = status==='AGUARDANDO' ? {status,gols_a:null,gols_b:null} : {status}; const {error}=await supabase.from('jogos').update(patch).eq('id',id); show(error?error.message:(status==='AGUARDANDO'?'Jogo resetado.':'Status atualizado.')); load(); }
  async function salvarResultado(j){ const {error}=await supabase.from('jogos').update({gols_a:j.gols_a,gols_b:j.gols_b}).eq('id',j.id); show(error?error.message:'Resultado salvo.'); load(); }
  const setGol=(id,k,v)=>setJogos(js=>js.map(j=>j.id===id?{...j,[k]:v===''?null:Number(v)}:j));

  return <div>
    <div className="panel form-grid">
      <select value={form.grupo_id} onChange={e=>setForm({...form,grupo_id:e.target.value})}><option value="">Grupo</option>{grupos.map(g=><option value={g.id} key={g.id}>{g.nome}</option>)}</select>
      <select value={form.selecao_a_id} onChange={e=>setForm({...form,selecao_a_id:e.target.value})}><option value="">Seleção A</option>{sel.map(s=><option value={s.id} key={s.id}>{s.nome}</option>)}</select>
      <select value={form.selecao_b_id} onChange={e=>setForm({...form,selecao_b_id:e.target.value})}><option value="">Seleção B</option>{sel.map(s=><option value={s.id} key={s.id}>{s.nome}</option>)}</select>
      <input type="datetime-local" value={form.data_hora} onChange={e=>setForm({...form,data_hora:e.target.value})}/><input placeholder="Estádio" value={form.estadio} onChange={e=>setForm({...form,estadio:e.target.value})}/><input placeholder="Cidade" value={form.cidade} onChange={e=>setForm({...form,cidade:e.target.value})}/><button onClick={add}>Criar jogo</button>
    </div>
    {edit && <div className="panel edit-panel"><h3>Editar jogo</h3><div className="form-grid"><select value={edit.grupo_id} onChange={e=>setEdit({...edit,grupo_id:e.target.value})}><option value="">Grupo</option>{grupos.map(g=><option value={g.id} key={g.id}>{g.nome}</option>)}</select><select value={edit.selecao_a_id} onChange={e=>setEdit({...edit,selecao_a_id:e.target.value})}><option value="">Seleção A</option>{sel.map(s=><option value={s.id} key={s.id}>{s.nome}</option>)}</select><select value={edit.selecao_b_id} onChange={e=>setEdit({...edit,selecao_b_id:e.target.value})}><option value="">Seleção B</option>{sel.map(s=><option value={s.id} key={s.id}>{s.nome}</option>)}</select><input type="datetime-local" value={edit.data_hora} onChange={e=>setEdit({...edit,data_hora:e.target.value})}/><input placeholder="Estádio" value={edit.estadio} onChange={e=>setEdit({...edit,estadio:e.target.value})}/><input placeholder="Cidade" value={edit.cidade} onChange={e=>setEdit({...edit,cidade:e.target.value})}/><input type="number" min="0" placeholder="Gols A" value={edit.gols_a} onChange={e=>setEdit({...edit,gols_a:e.target.value})}/><input type="number" min="0" placeholder="Gols B" value={edit.gols_b} onChange={e=>setEdit({...edit,gols_b:e.target.value})}/><select value={edit.status} onChange={e=>setEdit({...edit,status:e.target.value})}><option value="AGUARDANDO">Aguardando</option><option value="EM_ANDAMENTO">Em andamento</option><option value="FINALIZADO">Finalizado</option></select></div><div className="toolbar"><button onClick={saveEdit}>Salvar alterações</button><button className="secondary" onClick={()=>setEdit(null)}>Cancelar</button></div></div>}
    <div className="panel table-wrap"><table><thead><tr><th>Nº</th><th>Jogo</th><th>Data/Hora</th><th>Status</th><th>Resultado</th><th>Ações</th></tr></thead><tbody>{jogos.map(j=>{const info=statusInfo(j.status); return <tr key={j.id}><td>{j.partida_numero||'—'}</td><td><strong>{j.time_a} x {j.time_b}</strong><br/><small>Grupo {j.grupo_nome} · {[j.estadio,j.cidade].filter(Boolean).join(' · ')}</small></td><td>{fmtDate(j.data_hora)} BRT</td><td><span className={`status-pill inline ${info.cls}`}>{info.label}</span></td><td><div className="admin-score"><input type="number" min="0" value={j.gols_a??''} onChange={e=>setGol(j.id,'gols_a',e.target.value)}/><span>x</span><input type="number" min="0" value={j.gols_b??''} onChange={e=>setGol(j.id,'gols_b',e.target.value)}/><button onClick={()=>salvarResultado(j)}>Salvar</button></div></td><td className="actions"><button onClick={()=>mudarStatus(j.id,'EM_ANDAMENTO')}>▶ Iniciar</button><button onClick={()=>mudarStatus(j.id,'FINALIZADO')}>🏁 Finalizar</button><button className="secondary" onClick={()=>mudarStatus(j.id,'AGUARDANDO')}>↺ Reset</button><button onClick={()=>openEdit(j)}>Editar</button><button className="danger" onClick={()=>del(j.id)}>Excluir</button></td></tr>})}</tbody></table></div>
  </div>
}

function statusLabel(r){
  if (r.deleted_at) return {label:'Excluído', cls:'deleted'};
  if (r.ativo === false) return {label:'Inativo/Bloqueado', cls:'blocked'};
  return {label:'Ativo', cls:'active'};
}

function AdminParticipantes({show}){
  const [rows,setRows]=useState([]);
  const [busy,setBusy]=useState('');
  const load=()=>supabase.from('participantes').select('*').order('created_at', { ascending:false }).then(({data,error})=>error?show(error.message):setRows(data||[]));
  useEffect(load,[]);

  async function role(id,perfil){
    const {error}=await supabase.from('participantes').update({perfil}).eq('id',id);
    show(error?error.message:'Perfil atualizado.');
    load();
  }

  async function toggleAtivo(r){
    const current = (await supabase.auth.getUser()).data?.user?.id;
    if(r.perfil === 'admin' && r.id === current) return show('Você não pode bloquear seu próprio usuário admin.');
    const novo = r.ativo === false;
    const {error}=await supabase.from('participantes').update({ativo:novo, blocked_at: novo ? null : new Date().toISOString()}).eq('id',r.id);
    show(error?error.message:(novo?'Usuário desbloqueado.':'Usuário bloqueado.'));
    load();
  }

  async function excluirUsuario(r){
    const current = (await supabase.auth.getUser()).data?.user?.id;
    if(r.id === current) return show('Você não pode excluir seu próprio usuário logado.');
    if(!confirm(`Excluir ${r.nome || r.email}?\n\nIsso remove/bloqueia o usuário e tenta apagar também no Supabase Auth.`)) return;
    setBusy(r.id);
    const { data, error } = await supabase.functions.invoke('admin-delete-user', { body: { user_id: r.id } });
    if(error){
      show('Não consegui excluir no Auth. Verifique se a Edge Function admin-delete-user foi publicada. Marquei como excluído no cadastro.');
      await supabase.from('participantes').update({ativo:false, deleted_at:new Date().toISOString(), blocked_at:new Date().toISOString()}).eq('id',r.id);
    } else {
      show(data?.message || 'Usuário excluído.');
    }
    setBusy('');
    load();
  }

  return <div className="panel user-admin-panel">
    <div className="panel-head"><div><h3>Usuários do bolão</h3><p>Bloqueie, desbloqueie ou exclua participantes. Usuários inativos não conseguem palpitar e são deslogados automaticamente.</p></div><button onClick={load}>Atualizar</button></div>
    <div className="table-wrap"><table className="users-table"><thead><tr><th>Usuário</th><th>Telefone</th><th>Status</th><th>Perfil</th><th>Cadastro</th><th>Ações</th></tr></thead><tbody>{rows.map(r=>{ const st=statusLabel(r); return <tr key={r.id} className={r.ativo===false || r.deleted_at ? 'muted-row' : ''}><td><div className="user-cell"><span className="mini-avatar">{initials(r.nome || r.email)}</span><div><strong>{r.nome || 'Sem nome'}</strong><small>{r.email}</small></div></div></td><td>{r.telefone || '—'}</td><td><span className={`user-status ${st.cls}`}>{st.label}</span></td><td><span className="role-chip">{r.perfil || 'participante'}</span></td><td>{r.created_at ? fmtDate(r.created_at) : '—'}</td><td className="actions user-actions"><button onClick={()=>role(r.id,r.perfil==='admin'?'participante':'admin')}>{r.perfil==='admin'?'Tornar participante':'Tornar admin'}</button><button className={r.ativo===false?'':'secondary'} onClick={()=>toggleAtivo(r)}>{r.ativo===false?<><Unlock size={15}/> Desbloquear</>:<><Ban size={15}/> Bloquear</>}</button><button className="danger" disabled={busy===r.id || r.deleted_at} onClick={()=>excluirUsuario(r)}>{busy===r.id?'Excluindo...':<><Trash2 size={15}/> Excluir</>}</button></td></tr>})}</tbody></table></div>
  </div>
}
createRoot(document.getElementById('root')).render(<App />);
function calcularPremiacao(totalParticipantes, valor, taxa) {
  const total = totalParticipantes * valor;
  const taxaValor = total * (taxa / 100);
  const liquido = total - taxaValor;

  return {
    total,
    taxaValor,
    liquido,
    primeiro: liquido * 0.60,
    segundo: liquido * 0.25,
    terceiro: liquido * 0.15
  };
}
