async function carregarUsuarios() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')

  const tbody = document.querySelector('#tabelaUsuarios tbody')
  tbody.innerHTML = ''

  data.forEach(user => {
    const tr = document.createElement('tr')

    tr.innerHTML = `
      <td>${user.nome}</td>
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
  await supabase
    .from('usuarios')
    .update({ ativo: !ativo })
    .eq('id', id)

  alert('Status atualizado')
  carregarUsuarios()
}

async function excluirUsuario(id) {
  if (!confirm('Tem certeza?')) return

  await supabase
    .from('usuarios')
    .delete()
    .eq('id', id)

  alert('Usuário excluído')
  carregarUsuarios()
}

carregarUsuarios()
