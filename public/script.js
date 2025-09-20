const form = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const result = document.getElementById('result');
const linkInput = document.getElementById('linkInput');
const copyBtn = document.getElementById('copyBtn');
const message = document.getElementById('message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!fileInput.files.length) return;
  uploadBtn.disabled = true;
  message.textContent = 'A carregar...';

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  try {
    const res = await fetch('/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) {
      linkInput.value = data.link;
      result.classList.remove('hidden');
      message.textContent = 'Ficheiro carregado com sucesso.';
    } else {
      message.textContent = data.error || 'Erro no upload';
    }
  } catch (err) {
    message.textContent = 'Erro na comunicação com o servidor';
  }

  uploadBtn.disabled = false;
});

copyBtn.addEventListener('click', () => {
  linkInput.select();
  document.execCommand('copy');
});
