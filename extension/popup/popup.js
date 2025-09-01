// popup/popup.js - VERSIÓN LOCAL CON OPENAI API KEY

document.addEventListener('DOMContentLoaded', async function() {
  // Elementos DOM
  const loadingView = document.getElementById('loadingView');
  const apiKeyView = document.getElementById('apiKeyView');
  const mainView = document.getElementById('mainView');
  const apiKeyForm = document.getElementById('apiKeyForm');
  const apiKeyError = document.getElementById('apiKeyError');
  const statusElement = document.getElementById('status');
  const taskTypeButtons = document.getElementById('taskTypeButtons');
  const loadingMsg = document.getElementById('loadingMsg');
  const useSelectedTextCheckbox = document.getElementById('useSelectedText');
  const textModeHelp = document.getElementById('textModeHelp');
  const helpIcon = document.getElementById('helpIcon');
  const helpText = document.getElementById('helpText');
  const toggleApiKeyBtn = document.getElementById('toggleApiKey');
  const apiKeyInput = document.getElementById('apiKey');
  const apiKeyEyeIcon = document.getElementById('apiKeyEyeIcon');
  const apiStatusIcon = document.getElementById('apiStatusIcon');
  const apiStatusText = document.getElementById('apiStatusText');
  
  // Helper para enviar mensajes al background
  async function sendToBackground(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }
  
  // FUNCIONALIDADES DE API KEY
  function setupApiKeyToggle() {
    if (toggleApiKeyBtn && apiKeyInput && apiKeyEyeIcon) {
      toggleApiKeyBtn.addEventListener('click', () => {
        const isPassword = apiKeyInput.type === 'password';
        
        apiKeyInput.type = isPassword ? 'text' : 'password';
        apiKeyEyeIcon.textContent = isPassword ? '🙈' : '👁️';
        
        apiKeyInput.focus();
      });
    }
  }
  
  function loadTextSelectionPreference() {
    const savedPreference = localStorage.getItem('ch_use_selected_text');
    
    if (savedPreference !== null) {
      useSelectedTextCheckbox.checked = savedPreference === 'true';
    }
    
    updateTextModeHelp();
  }
  
  function saveTextSelectionPreference() {
    localStorage.setItem('ch_use_selected_text', useSelectedTextCheckbox.checked.toString());
  }
  
  // VERIFICACIÓN DE API KEY
  async function checkApiKeyStatus() {
    try {
      const result = await sendToBackground({ action: 'checkApiKey' });
      
      if (result.hasApiKey) {
        showMainView();
        loadTaskTypes();
      } else {
        showApiKeyView();
      }
    } catch (error) {
      console.error('Error checking API key:', error);
      showApiKeyView();
    }
  }
  
  // MANEJO DE VISTAS
  function showApiKeyView() {
    loadingView.style.display = 'none';
    apiKeyView.style.display = 'block';
    mainView.style.display = 'none';
    
    setupApiKeyToggle();
  }
  
  function showMainView() {
    loadingView.style.display = 'none';
    apiKeyView.style.display = 'none';
    mainView.style.display = 'block';
    
    loadTextSelectionPreference();
    updateApiStatus();
  }
  
  async function updateApiStatus() {
    try {
      const result = await sendToBackground({ action: 'getApiKey' });
      if (result.apiKey) {
        apiStatusIcon.textContent = '🟢';
        apiStatusText.textContent = `API Key OK`;
      }
    } catch (error) {
      apiStatusIcon.textContent = '🔴';
      apiStatusText.textContent = 'Error con API Key';
    }
  }
  
  // EVENT HANDLERS
  async function handleApiKeySave(e) {
    e.preventDefault();
    
    const apiKey = document.getElementById('apiKey').value.trim();
    const saveBtn = document.getElementById('saveApiKeyBtn');
    
    if (!apiKey) {
      showApiKeyError('Por favor ingresa tu API Key de OpenAI');
      return;
    }
    
    if (!apiKey.startsWith('sk-')) {
      showApiKeyError('La API Key debe comenzar con "sk-"');
      return;
    }
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Validando...';
    apiKeyError.classList.add('ch-d-none');
    
    try {
      // Guardar API Key
      await sendToBackground({
        action: 'setApiKey',
        apiKey: apiKey
      });
      
      // Hacer una llamada de prueba simple para validar la key
      const testResponse = await sendToBackground({
        action: 'createTaskExecution',
        taskTypeId: 'test',
        title: 'Prueba de API',
        inputText: 'Test'
      });
      
      showMainView();
      loadTaskTypes();
      
    } catch (error) {
      console.error('API key validation error:', error);
      let errorMessage = 'API Key inválida o sin permisos';
      
      if (error.message.includes('insufficient_quota')) {
        errorMessage = 'API Key sin créditos disponibles';
      } else if (error.message.includes('invalid_api_key')) {
        errorMessage = 'API Key inválida';
      } else if (error.message.includes('rate_limit')) {
        errorMessage = 'Límite de uso alcanzado, intenta más tarde';
      }
      
      showApiKeyError(errorMessage);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Guardar y Continuar';
    }
  }
  
  function showApiKeyError(message) {
    apiKeyError.textContent = message;
    apiKeyError.classList.remove('ch-d-none');
  }
    
  function handleOpenAIDocsClick(e) {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://platform.openai.com/api-keys' });
  }
    
  // TIPOS DE TAREA
  async function loadTaskTypes() {
    try {
      loadingMsg.style.display = 'none';
      taskTypeButtons.innerHTML = '<div class="ch-text-center ch-p-2"><small class="ch-text-muted">Cargando tipos de tarea...</small></div>';
      
      const taskTypes = await sendToBackground({ action: 'getAvailableTaskTypes' });
      
      console.log('Available task types:', taskTypes);
      
      taskTypeButtons.innerHTML = '';
      
      if (!taskTypes || taskTypes.length === 0) {
        taskTypeButtons.innerHTML = `
          <div class="ch-text-center ch-p-3">
            <p class="ch-text-muted ch-mb-2">No hay tipos de tarea configurados</p>
            <small class="ch-text-muted">Ve a Configuración para crear nuevas tareas</small>
          </div>
        `;
        return;
      }
      
      taskTypes
        .filter(taskType => taskType.is_active)
        .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name))
        .forEach(taskType => {
          const button = document.createElement('button');
          button.className = 'ch-btn ch-btn-primary ch-task-btn ch-btn-block';
          button.setAttribute('data-task-type-id', taskType.id);
          
          const icon = getTaskTypeIcon(taskType.name);
          button.innerHTML = `${icon} ${taskType.name}`;
          button.title = taskType.description || taskType.name;
          
          button.addEventListener('click', () => handleTaskTypeSelection(taskType));
          
          taskTypeButtons.appendChild(button);
        });
      
    } catch (error) {
      console.error('Error loading task types:', error);
      taskTypeButtons.innerHTML = `
        <div class="ch-alert ch-alert-danger ch-text-center">
          <small>Error al cargar tipos de tarea: ${error.message}</small>
        </div>
      `;
    }
  }

  function getTaskTypeIcon(taskName) {
    const iconMap = {
      'hilo': '🧵', 'twitter': '🧵', 'x': '🧵', 'thread': '🧵',
      'video': '🎬', 'guion': '🎬', 'guión': '🎬', 'script': '🎬',
      'correccion': '✏️', 'corrección': '✏️', 'estilo': '✏️', 'resumen': '✏️', 'bullet': '📝',
      'reescribir': '📝', 'nota': '📝', 'titular': '📰', 'headline': '📰',
      'desmentido': '🚫', 'debunk': '🚫', 'verificar': '🔍',
      'buscar': '🔍', 'refinamiento': '🔄'
    };
    
    const lowerName = taskName.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerName.includes(key)) {
        return icon;
      }
    }
    
    return '✨';
  }

  function updateTextModeHelp() {
    if (useSelectedTextCheckbox.checked) {
      helpIcon.textContent = '✓';
      helpIcon.style.color = 'var(--ch-success)';
      helpText.textContent = 'Procesará únicamente el texto que hayas seleccionado en la página';
      textModeHelp.style.color = 'var(--ch-text-primary)';
    } else {
      helpIcon.textContent = '📄';
      helpIcon.style.color = 'var(--ch-text-muted)';
      helpText.textContent = 'Procesará todo el contenido de la página';
      textModeHelp.style.color = 'var(--ch-text-muted)';
    }
  }

  async function handleTaskTypeSelection(taskType) {
    chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
      if (!tabs || !tabs[0]) {
        showStatus('No se pudo acceder a la pestaña activa', 'error');
        return;
      }
      
      const currentTab = tabs[0];
      
      if (useSelectedTextCheckbox.checked) {
        try {
          const hasSelection = await checkForTextSelection(currentTab.id);
          if (!hasSelection) {
            showStatus('📝 Por favor, selecciona el texto que quieres procesar en la página', 'warning');
            return;
          }
        } catch (error) {
          showStatus('Error al verificar texto seleccionado. Intenta recargar la página.', 'error');
          return;
        }
      }
      
      showStatus(`Procesando: ${taskType.name}...`, 'loading');
      
      chrome.tabs.sendMessage(currentTab.id, {
        action: 'processWithBackend',
        taskType: taskType,
        taskIcon: getTaskTypeIcon(taskType.name),
        useSelectedText: useSelectedTextCheckbox.checked
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Error al comunicarse con el script de contenido:', chrome.runtime.lastError);
          
          if (chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
            showStatus('Por favor, recarga la página e intenta nuevamente', 'error');
          } else {
            showStatus('Error: no se pudo procesar la página', 'error');
          }
        } else {
          window.close();
        }
      });
    });
  }
  
  async function checkForTextSelection(tabId) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: 'checkSelection' }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(false);
        } else {
          resolve(response && response.hasSelection);
        }
      });
    });
  }
  
  function showStatus(message, type = 'loading') {
    statusElement.textContent = message;
    
    statusElement.className = 'ch-alert ch-text-center';
    
    switch(type) {
      case 'success':
        statusElement.classList.add('ch-alert-success');
        break;
      case 'error':
        statusElement.classList.add('ch-alert-danger');
        break;
      case 'warning':
        statusElement.classList.add('ch-alert-warning');
        break;
      default:
        statusElement.classList.add('ch-alert-info');
    }
    
    statusElement.classList.remove('ch-d-none');
    
    if (type !== 'loading') {
      setTimeout(() => {
        statusElement.classList.add('ch-d-none');
      }, type === 'warning' ? 5000 : 3000);
    }
  }
  
  // EVENT LISTENERS
  apiKeyForm.addEventListener('submit', handleApiKeySave);
  document.getElementById('openSettings').addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
  
  useSelectedTextCheckbox.addEventListener('change', () => {
    updateTextModeHelp();
    saveTextSelectionPreference();
  });
  
  document.getElementById('openAIDocsLink').addEventListener('click', handleOpenAIDocsClick);
  
  // INICIALIZACIÓN
  await checkApiKeyStatus();
});