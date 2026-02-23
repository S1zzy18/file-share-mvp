const form = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const result = document.getElementById('result');
const linkInput = document.getElementById('linkInput');
const copyBtn = document.getElementById('copyBtn');
const message = document.getElementById('message');

// Novos elementos para a barra de progresso
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressPercent = document.getElementById('progressPercent');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  if (!fileInput.files.length) return;

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);

  // Reset de UI
  uploadBtn.disabled = true;
  message.textContent = 'A iniciar upload...';
  progressContainer.classList.remove('hidden');
  progressFill.style.width = '0%';
  progressPercent.textContent = '0%';

  const xhr = new XMLHttpRequest();

  // Esta é a parte que faz a magia da barra de progresso
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      progressFill.style.width = percent + '%';
      progressPercent.textContent = percent + '%';
      message.textContent = `A carregar: ${percent}%`;
    }
  });

  // Quando o upload termina
  xhr.onload = () => {
    uploadBtn.disabled = false;
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText);
      linkInput.value = data.link;
      result.classList.remove('hidden');
      message.textContent = 'Ficheiro carregado com sucesso!';
      progressContainer.classList.add('hidden'); // Esconde a barra ao terminar
    } else {
      const errorData = JSON.parse(xhr.responseText || '{}');
      message.textContent = errorData.error || 'Erro no upload';
      progressContainer.classList.add('hidden');
    }
  };

  xhr.onerror = () => {
    uploadBtn.disabled = false;
    message.textContent = 'Erro na comunicação com o servidor';
    progressContainer.classList.add('hidden');
  };

  xhr.open('POST', '/upload');
  xhr.send(formData);
});

copyBtn.addEventListener('click', () => {
  linkInput.select();
  document.execCommand('copy');
  const originalText = copyBtn.textContent;
  copyBtn.textContent = 'Copiado!';
  setTimeout(() => copyBtn.textContent = originalText, 2000);
});
