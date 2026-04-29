import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { CalendarDays, Eye, Gauge, LogOut, Settings, Trophy, UserRound, Users, Vote, Shield, Flag, ListChecks } from 'lucide-react';
import './style.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const FLAG_BASE = 'https://flagcdn.com/w40/';
const flagSrc = (code) => code ? `${FLAG_BASE}${code}.png` : '';

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
  try { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v)); } catch { return v; }
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
      setProfile(data);
    }
    loadProfile();
  }, [session?.user?.id]);

  if (loading) return <div className="center">Carregando...</div>;
  if (!supabaseUrl || !supabaseKey) return <div className="center error">Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na Vercel.</div>;
  if (!session) return <Auth show={show} />;

  const isAdmin = profile?.perfil === 'admin';

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><Trophy/> <span>Bolão da Copa 2026</span></div>
      <NavItem icon={<Gauge/>} active={view==='dashboard'} onClick={()=>setView('dashboard')}>Dashboard</NavItem>
      <NavItem icon={<Vote/>} active={view==='meus'} onClick={()=>setView('meus')}>Meus Palpites</NavItem>
      <NavItem icon={<Eye/>} active={view==='ver'} onClick={()=>setView('ver')}>Ver Palpites</NavItem>
      <NavItem icon={<CalendarDays/>} active={view==='calendario'} onClick={()=>setView('calendario')}>Calendário</NavItem>
      <NavItem icon={<ListChecks/>} active={view==='ranking'} onClick={()=>setView('ranking')}>Ranking</NavItem>
      {isAdmin && <NavItem icon={<Settings/>} active={view==='admin'} onClick={()=>setView('admin')}>Administração</NavItem>}
      <button className="logout" onClick={()=>supabase.auth.signOut()}><LogOut size={18}/> Sair</button>
    </aside>
    <main className="content">
      <header className="topbar"><div><h1>{titleFor(view)}</h1><p>{profile?.nome || session.user.email}</p></div>{toast && <div className="toast">{toast}</div>}</header>
      {view === 'dashboard' && <Dashboard show={show}/>} 
      {view === 'meus' && <MeusPalpites user={session.user} show={show}/>} 
      {view === 'ver' && <VerPalpites show={show}/>} 
      {view === 'calendario' && <Calendario show={show}/>} 
      {view === 'ranking' && <Ranking show={show}/>} 
      {view === 'admin' && isAdmin && <Admin show={show}/>} 
    </main>
  </div>
}

function titleFor(v){ return ({dashboard:'Dashboard', meus:'Meus Palpites', ver:'Ver Palpites', calendario:'Calendário de Jogos', ranking:'Ranking', admin:'Administração'})[v] || 'Bolão'; }
function NavItem({children, icon, active, onClick}){ return <button className={`nav ${active?'active':''}`} onClick={onClick}>{icon}{children}</button> }

function Auth({show}) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    const res = isLogin ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { data: { nome } } });
    setBusy(false);
    if (res.error) show(res.error.message); else show(isLogin ? 'Login realizado.' : 'Cadastro criado. Confira seu e-mail se a confirmação estiver ativa.');
  };
  const reset = async () => { if (!email) return show('Informe seu e-mail.'); const { error } = await supabase.auth.resetPasswordForEmail(email); show(error ? error.message : 'E-mail de recuperação enviado.'); };
  return <div className="auth"><form onSubmit={submit} className="auth-card"><h1>Bolão da Copa 2026</h1><p>{isLogin?'Acesse sua conta':'Crie sua conta'}</p>{!isLogin && <input placeholder="Nome" value={nome} onChange={e=>setNome(e.target.value)} required/>}<input placeholder="E-mail" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><input placeholder="Senha" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/><button disabled={busy}>{busy?'Aguarde...':isLogin?'Entrar':'Cadastrar'}</button><button type="button" className="link" onClick={()=>setIsLogin(!isLogin)}>{isLogin?'Criar conta':'Já tenho conta'}</button><button type="button" className="link" onClick={reset}>Esqueci minha senha</button></form></div>
}

async function fetchJogos(show){
  const { data, error } = await supabase.from('jogos_view').select('*').order('grupo_nome').order('data_hora', { nullsFirst: false });
  if (error) { show?.(`Erro ao carregar jogos: ${error.message}`); return []; }
  return data || [];
}

function GameCard({jogo, children}){
  return <div className={`game-card ${jogo.gols_a !== null && jogo.gols_a !== undefined && jogo.gols_b !== null && jogo.gols_b !== undefined ? 'finished' : ''}`}>
    <div className="game-meta"><span>Grupo {jogo.grupo_nome || '-'}</span><span>{fmtDate(jogo.data_hora)}</span></div>
    <div className="match-row">
      <div className="team left">{jogo.a_bandeira && <img src={flagSrc(jogo.a_bandeira)} />}<strong>{jogo.time_a}</strong></div>
      {children}
      <div className="team right"><strong>{jogo.time_b}</strong>{jogo.b_bandeira && <img src={flagSrc(jogo.b_bandeira)} />}</div>
    </div>
  </div>
}

function MeusPalpites({user, show}){
  const [jogos, setJogos] = useState([]); const [palpites, setPalpites] = useState({}); const [config, setConfig] = useState(null);
  useEffect(()=>{ load(); }, []);
  async function load(){
    setJogos(await fetchJogos(show));
    const { data: cfg } = await supabase.from('configuracao_bolao').select('*').eq('id',1).maybeSingle(); setConfig(cfg);
    const { data, error } = await supabase.from('palpites').select('*').eq('participante_id', user.id);
    if (error) show(`Erro ao carregar palpites: ${error.message}`); else setPalpites(Object.fromEntries((data||[]).map(p=>[p.jogo_id,p])));
  }
  const fechado = config?.limite_palpite ? new Date() > new Date(config.limite_palpite) : false;
  const setVal = (jogoId, k, v) => setPalpites(p => ({...p, [jogoId]: {...(p[jogoId]||{}), jogo_id:jogoId, participante_id:user.id, [k]: v === '' ? null : Number(v)}}));
  const saveAll = async () => {
    if (fechado) return show('Prazo de palpites encerrado.');
    const rows = Object.values(palpites).filter(p => p.palpite_a !== null && p.palpite_a !== undefined && p.palpite_b !== null && p.palpite_b !== undefined);
    const { error } = await supabase.from('palpites').upsert(rows, { onConflict: 'participante_id,jogo_id' });
    show(error ? `Erro ao salvar: ${error.message}` : 'Palpites salvos com sucesso.');
  };
  return <section><div className="toolbar sticky-actions"><span>{fechado?'🔒 Palpites encerrados':'🟢 Palpites abertos'}</span><button onClick={saveAll} disabled={fechado}>Salvar Palpites</button></div>{jogos.map(j=>{ const p = palpites[j.id] || {}; const pts = calcPoints(j,p); return <GameCard key={j.id} jogo={j}><div className="scorebox"><input disabled={fechado} type="number" min="0" value={p.palpite_a ?? ''} onChange={e=>setVal(j.id,'palpite_a',e.target.value)} /><span>x</span><input disabled={fechado} type="number" min="0" value={p.palpite_b ?? ''} onChange={e=>setVal(j.id,'palpite_b',e.target.value)} /></div><div className="result-line card-details"><span>Oficial: <strong>{j.gols_a ?? '—'} x {j.gols_b ?? '—'}</strong></span><span className={pointClass(pts)}>{pts === null ? 'Aguardando' : `+${pts} pts`}</span><small>{pointReason(j,p)}</small></div></GameCard>})}</section>
}

function VerPalpites({show}){
  const [users,setUsers]=useState([]), [selected,setSelected]=useState(''), [jogos,setJogos]=useState([]), [palpites,setPalpites]=useState({});
  useEffect(()=>{(async()=>{ const {data:us}=await supabase.from('participantes').select('*').order('nome'); setUsers(us||[]); if(us?.[0]) setSelected(us[0].id); setJogos(await fetchJogos(show)); })()},[]);
  useEffect(()=>{ if(!selected) return; (async()=>{ const {data,error}=await supabase.from('palpites').select('*').eq('participante_id',selected); if(error) show(error.message); else setPalpites(Object.fromEntries((data||[]).map(p=>[p.jogo_id,p]))); })(); },[selected]);
  return <section><div className="toolbar participant-picker"><label>Participante</label><select value={selected} onChange={e=>setSelected(e.target.value)}>{users.map(u=><option key={u.id} value={u.id}>{u.nome || u.email}</option>)}</select></div>{jogos.map(j=>{ const p=palpites[j.id]; const pts=calcPoints(j,p); return <GameCard key={j.id} jogo={j}><div className="scorebox read"><span>{p?.palpite_a ?? '—'}</span><span>x</span><span>{p?.palpite_b ?? '—'}</span></div><div className="result-line card-details"><span>Oficial: <strong>{j.gols_a ?? '—'} x {j.gols_b ?? '—'}</strong></span><span className={pointClass(pts)}>{pts === null ? 'Aguardando' : `+${pts} pts`}</span><small>{pointReason(j,p)}</small></div></GameCard>})}</section>
}

function Calendario({show}){
  const [jogos,setJogos]=useState([]); useEffect(()=>{fetchJogos(show).then(setJogos)},[]);
  return <section>{jogos.length===0 && <Empty msg="Nenhum jogo cadastrado."/>}{jogos.map(j=><GameCard key={j.id} jogo={j}><div className="scorebox read official"><span>{j.gols_a ?? '—'}</span><span>x</span><span>{j.gols_b ?? '—'}</span></div><div className="result-line">{j.gols_a === null || j.gols_a === undefined || j.gols_b === null || j.gols_b === undefined ? 'Jogo em aberto' : 'Resultado oficial informado'}</div></GameCard>)}</section>
}

function Ranking({show}){
  const [rows,setRows]=useState([]); useEffect(()=>{load()},[]);
  async function load(){
    const jogos = await fetchJogos(show);
    const {data: users}=await supabase.from('participantes').select('*');
    const {data: pals,error}=await supabase.from('palpites').select('*'); if(error) return show(error.message);
    const byGame=Object.fromEntries(jogos.map(j=>[j.id,j]));
    const totals=(users||[]).map(u=>{ const ps=(pals||[]).filter(p=>p.participante_id===u.id); const pontos=ps.reduce((s,p)=>s+(calcPoints(byGame[p.jogo_id],p)||0),0); const exatos=ps.filter(p=>calcPoints(byGame[p.jogo_id],p)===5).length; return {...u,pontos,exatos}; }).sort((a,b)=>b.pontos-a.pontos || b.exatos-a.exatos || (a.nome||'').localeCompare(b.nome||''));
    setRows(totals);
  }
  return <div className="ranking-list">{rows.map((r,i)=><div className={`ranking-card ${i===0?'leader':''}`} key={r.id}><div className="ranking-pos">{medal(i)}</div><div className="ranking-name"><strong>{r.nome || r.email}</strong><span>{r.exatos} placar(es) exato(s)</span></div><div className="ranking-score">{r.pontos}<small>pts</small></div></div>)}</div>
}

function Dashboard({show}){
  const [stats,setStats]=useState({jogos:0,participantes:0,palpites:0});
  useEffect(()=>{(async()=>{ const [{count:j},{count:u},{count:p}] = await Promise.all([supabase.from('jogos').select('*',{count:'exact',head:true}),supabase.from('participantes').select('*',{count:'exact',head:true}),supabase.from('palpites').select('*',{count:'exact',head:true})]); setStats({jogos:j||0,participantes:u||0,palpites:p||0}); })()},[]);
  return <div className="cards"><KPI label="Jogos" value={stats.jogos}/><KPI label="Participantes" value={stats.participantes}/><KPI label="Palpites salvos" value={stats.palpites}/></div>
}
function KPI({label,value}){ return <div className="kpi"><span>{label}</span><strong>{value}</strong></div> }
function Empty({msg}){ return <div className="empty">{msg}</div> }

function Admin({show}){
  const [tab,setTab]=useState('config');
  return <section><div className="admin-tabs"><button className={tab==='config'?'active':''} onClick={()=>setTab('config')}>Configuração</button><button className={tab==='selecoes'?'active':''} onClick={()=>setTab('selecoes')}>Seleções</button><button className={tab==='grupos'?'active':''} onClick={()=>setTab('grupos')}>Grupos</button><button className={tab==='jogos'?'active':''} onClick={()=>setTab('jogos')}>Jogos</button><button className={tab==='resultados'?'active':''} onClick={()=>setTab('resultados')}>Resultados</button><button className={tab==='participantes'?'active':''} onClick={()=>setTab('participantes')}>Participantes</button></div>{tab==='config'&&<AdminConfig show={show}/>} {tab==='selecoes'&&<AdminSelecoes show={show}/>} {tab==='grupos'&&<AdminGrupos show={show}/>} {tab==='jogos'&&<AdminJogos show={show}/>} {tab==='resultados'&&<AdminResultados show={show}/>} {tab==='participantes'&&<AdminParticipantes show={show}/>}</section>
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
  const [form,setForm]=useState({grupo_id:'',selecao_a_id:'',selecao_b_id:'',data_hora:''});
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
    const row={...form,data_hora:form.data_hora?new Date(form.data_hora).toISOString():null};
    const {error}=await supabase.from('jogos').insert(row);
    show(error?error.message:'Jogo criado.');
    if(!error) setForm({grupo_id:'',selecao_a_id:'',selecao_b_id:'',data_hora:''});
    load();
  }

  async function genAll(){
    if(!confirm('Gerar todos os jogos por grupo? Isso não apaga jogos já existentes.')) return;
    let total = 0;
    for(const g of grupos){
      const {data:gs,error}=await supabase.from('grupo_selecoes').select('selecao_id').eq('grupo_id',g.id);
      if(error){ show(error.message); return; }
      const ids=(gs||[]).map(x=>x.selecao_id);
      const rows=[];
      for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++) rows.push({grupo_id:g.id,selecao_a_id:ids[i],selecao_b_id:ids[j],data_hora:null});
      if(rows.length){ const {error:ei}=await supabase.from('jogos').insert(rows); if(ei){ show(ei.message); return; } total += rows.length; }
    }
    show(`${total} jogos gerados.`);
    load();
  }

  async function del(id){
    if(!confirm('Excluir jogo?'))return;
    const {error}=await supabase.from('jogos').delete().eq('id',id);
    show(error?error.message:'Jogo excluído.');
    load();
  }

  function openEdit(j){
    setEdit({
      id: j.id,
      grupo_id: j.grupo_id || '',
      selecao_a_id: j.selecao_a_id || '',
      selecao_b_id: j.selecao_b_id || '',
      data_hora: toInputDateTime(j.data_hora),
      gols_a: j.gols_a ?? '',
      gols_b: j.gols_b ?? ''
    });
  }

  async function saveEdit(){
    if(!edit.grupo_id || !edit.selecao_a_id || !edit.selecao_b_id) return show('Informe grupo, seleção A e seleção B.');
    if(String(edit.selecao_a_id) === String(edit.selecao_b_id)) return show('Seleção A e B não podem ser iguais.');
    const row={
      grupo_id: Number(edit.grupo_id),
      selecao_a_id: Number(edit.selecao_a_id),
      selecao_b_id: Number(edit.selecao_b_id),
      data_hora: edit.data_hora ? new Date(edit.data_hora).toISOString() : null,
      gols_a: edit.gols_a === '' ? null : Number(edit.gols_a),
      gols_b: edit.gols_b === '' ? null : Number(edit.gols_b)
    };
    const {error}=await supabase.from('jogos').update(row).eq('id',edit.id);
    show(error?error.message:'Jogo atualizado.');
    if(!error) setEdit(null);
    load();
  }

  return <div>
    <div className="toolbar"><button onClick={genAll}>Gerar todos os jogos por grupo</button></div>
    <div className="panel form-grid">
      <select value={form.grupo_id} onChange={e=>setForm({...form,grupo_id:e.target.value})}><option value="">Grupo</option>{grupos.map(g=><option value={g.id} key={g.id}>{g.nome}</option>)}</select>
      <select value={form.selecao_a_id} onChange={e=>setForm({...form,selecao_a_id:e.target.value})}><option value="">Seleção A</option>{sel.map(s=><option value={s.id} key={s.id}>{s.nome}</option>)}</select>
      <select value={form.selecao_b_id} onChange={e=>setForm({...form,selecao_b_id:e.target.value})}><option value="">Seleção B</option>{sel.map(s=><option value={s.id} key={s.id}>{s.nome}</option>)}</select>
      <input type="datetime-local" value={form.data_hora} onChange={e=>setForm({...form,data_hora:e.target.value})}/>
      <button onClick={add}>Criar jogo</button>
    </div>

    {edit && <div className="panel edit-panel">
      <h3>Editar jogo</h3>
      <div className="form-grid">
        <select value={edit.grupo_id} onChange={e=>setEdit({...edit,grupo_id:e.target.value})}><option value="">Grupo</option>{grupos.map(g=><option value={g.id} key={g.id}>{g.nome}</option>)}</select>
        <select value={edit.selecao_a_id} onChange={e=>setEdit({...edit,selecao_a_id:e.target.value})}><option value="">Seleção A</option>{sel.map(s=><option value={s.id} key={s.id}>{s.nome}</option>)}</select>
        <select value={edit.selecao_b_id} onChange={e=>setEdit({...edit,selecao_b_id:e.target.value})}><option value="">Seleção B</option>{sel.map(s=><option value={s.id} key={s.id}>{s.nome}</option>)}</select>
        <input type="datetime-local" value={edit.data_hora} onChange={e=>setEdit({...edit,data_hora:e.target.value})}/>
        <input type="number" min="0" placeholder="Gols A" value={edit.gols_a} onChange={e=>setEdit({...edit,gols_a:e.target.value})}/>
        <input type="number" min="0" placeholder="Gols B" value={edit.gols_b} onChange={e=>setEdit({...edit,gols_b:e.target.value})}/>
      </div>
      <div className="toolbar"><button onClick={saveEdit}>Salvar alterações</button><button className="secondary" onClick={()=>setEdit(null)}>Cancelar</button></div>
    </div>}

    <CalendarioTable jogos={jogos} onEdit={openEdit} onDel={del}/>
  </div>
}

function CalendarioTable({jogos,onEdit,onDel}){ return <div className="panel"><table><thead><tr><th>Grupo</th><th>Jogo</th><th>Data/Hora</th><th>Placar</th><th>Ações</th></tr></thead><tbody>{jogos.map(j=><tr key={j.id}><td>Grupo {j.grupo_nome}</td><td>{j.time_a} x {j.time_b}</td><td>{fmtDate(j.data_hora)}</td><td>{j.gols_a ?? '—'} x {j.gols_b ?? '—'}</td><td className="actions">{onEdit&&<button onClick={()=>onEdit(j)}>Editar</button>}{onDel&&<button className="danger" onClick={()=>onDel(j.id)}>Excluir</button>}</td></tr>)}</tbody></table></div> }
function AdminResultados({show}){ const [jogos,setJogos]=useState([]); useEffect(()=>{fetchJogos(show).then(setJogos)},[]); const setVal=(id,k,v)=>setJogos(js=>js.map(j=>j.id===id?{...j,[k]:v===''?null:+v}:j)); async function save(j){ const {error}=await supabase.from('jogos').update({gols_a:j.gols_a,gols_b:j.gols_b}).eq('id',j.id); show(error?error.message:'Resultado salvo.'); } return <div>{jogos.map(j=><GameCard key={j.id} jogo={j}><div className="scorebox"><input type="number" min="0" value={j.gols_a??''} onChange={e=>setVal(j.id,'gols_a',e.target.value)}/><span>x</span><input type="number" min="0" value={j.gols_b??''} onChange={e=>setVal(j.id,'gols_b',e.target.value)}/><button onClick={()=>save(j)}>Salvar</button></div></GameCard>)}</div> }
function AdminParticipantes({show}){ const [rows,setRows]=useState([]); const load=()=>supabase.from('participantes').select('*').order('nome').then(({data,error})=>error?show(error.message):setRows(data||[])); useEffect(load,[]); async function role(id,perfil){ const {error}=await supabase.from('participantes').update({perfil}).eq('id',id); show(error?error.message:'Perfil atualizado.'); load(); } return <div className="panel"><table><thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Ação</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.nome}</td><td>{r.email}</td><td>{r.perfil}</td><td><button onClick={()=>role(r.id,r.perfil==='admin'?'participante':'admin')}>{r.perfil==='admin'?'Tornar participante':'Tornar admin'}</button></td></tr>)}</tbody></table></div> }

createRoot(document.getElementById('root')).render(<App />);
