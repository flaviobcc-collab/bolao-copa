async function carregarUsuarios() {
  const { data, error } = await supabase
    .from('participantes')
    .select('*')

  if (error) {
    console.error(error)
    alert('Erro ao carregar usuários')
    return
  }

  const tbody = document.querySelector('#tabelaUsuarios tbody')
  tbody.innerHTML = ''

  data.forEach(user => {
    const tr = document.createElement('tr')

    tr.innerHTML = `
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.ativo ? 'Ativo' : 'Inativo'}</td>
      <td>
        <button onclick="toggleUsuario('${user.id}', ${user.ativo})">
          ${user.ativo ? 'Bloquear' : 'Ativar'}
        </button>
        <button onclick="excluirUsuario('${user.id}')">
          Excluir
        </button>
      </td>
    `

    tbody.appendChild(tr)
  })
}

async function toggleUsuario(id, ativo) {
  const { error } = await supabase
    .from('participantes')
    .update({ ativo: !ativo })
    .eq('id', id)

  if (error) {
    console.error(error)
    alert('Erro ao atualizar usuário')
    return
  }

  alert('Status atualizado')
  carregarUsuarios()
}

async function excluirUsuario(id) {
  if (!confirm('Tem certeza?')) return

  const { error } = await supabase
    .from('participantes')
    .delete()
    .eq('id', id)

  if (error) {
    console.error(error)
    alert('Erro ao excluir usuário')
    return
  }

  alert('Usuário excluído')
  carregarUsuarios()
}

carregarUsuarios()
