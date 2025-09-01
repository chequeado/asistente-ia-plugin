// settings/settings.js - VERSIÓN LOCAL PARA GESTIÓN DE TAREAS

document.addEventListener('DOMContentLoaded', async function() {
  // Elementos DOM
  const taskTypeSelect = document.getElementById('taskTypeSelect');
  const taskEditorSection = document.getElementById('taskEditorSection');
  const statusMessage = document.getElementById('statusMessage');
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  const newApiKeyInput = document.getElementById('newApiKey');
  const updateApiKeyBtn = document.getElementById('updateApiKeyBtn');
  const exportTasksBtn = document.getElementById('exportTasksBtn');
  const importTasksBtn = document.getElementById('importTasksBtn');
  const resetTasksBtn = document.getElementById('resetTasksBtn');
  const importFile = document.getElementById('importFile');
  const createNewTaskBtn = document.getElementById('createNewTaskBtn');

  // Estado
  let allTasks = [];
  let currentTask = null;
  let isCreatingNewTask = false;

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

  // MANEJO DE API KEY
  async function loadApiKeyStatus() {
    try {
      const result = await sendToBackground({ action: 'getApiKey' });
      
      if (result.apiKey) {
        apiKeyStatus.innerHTML = `
          <div class="ch-alert ch-alert-success">
            <strong>✅ API Key configurada</strong><br>
            <small>Última parte: ...${result.apiKey.slice(-8)}</small>
          </div>
        `;
      } else {
        apiKeyStatus.innerHTML = `
          <div class="ch-alert ch-alert-warning">
            <strong>⚠️ API Key no configurada</strong><br>
            <small>Configura tu API Key para usar el asistente</small>
          </div>
        `;
      }
    } catch (error) {
      apiKeyStatus.innerHTML = `
        <div class="ch-alert ch-alert-danger">
          <strong>❌ Error al verificar API Key</strong><br>
          <small>${error.message}</small>
        </div>
      `;
    }
  }

  async function handleUpdateApiKey() {
    const apiKey = newApiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Por favor ingresa una API Key', 'error');
      return;
    }
    
    if (!apiKey.startsWith('sk-')) {
      showStatus('La API Key debe comenzar con "sk-"', 'error');
      return;
    }

    try {
      showStatus('Guardando API Key...', 'info');
      
      await sendToBackground({
        action: 'setApiKey',
        apiKey: apiKey
      });
      
      newApiKeyInput.value = '';
      showStatus('API Key actualizada exitosamente', 'success');
      loadApiKeyStatus();
      
    } catch (error) {
      showStatus('Error al guardar API Key: ' + error.message, 'error');
    }
  }

  // MANEJO DE TAREAS
  async function loadTasks() {
    try {
      showStatus('Cargando tareas...', 'info');
      
      allTasks = await sendToBackground({ action: 'getAvailableTaskTypes' });
      
      console.log('Tasks loaded:', allTasks);
      
      taskTypeSelect.innerHTML = '<option value="">Selecciona una tarea para editar...</option>';
      
      allTasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = `${task.name} ${task.is_active ? '' : '(Inactiva)'}`;
        option.dataset.task = JSON.stringify(task);
        taskTypeSelect.appendChild(option);
      });

      hideStatus();
    } catch (error) {
      showStatus('Error al cargar tareas: ' + error.message, 'error');
      console.error('Error:', error);
    }
  }

  function showTaskEditor(task = null, isCreating = false) {
    currentTask = task;
    isCreatingNewTask = isCreating;
    
    const taskName = task?.name || '';
    const taskDescription = task?.description || '';
    const taskPrompt = task?.prompt || 'Procesa el siguiente contenido:\n\n{{input_text}}\n\nResultado:';
    const taskOrder = task?.order || 0;
    const usesAttachments = task?.uses_attachements || false;
    const isActive = task?.is_active !== false;
    
    taskEditorSection.innerHTML = `
      <div class="ch-mb-4">
        <h4 class="ch-mb-3">${isCreating ? '✨ Crear nueva tarea' : '✏️ Editar tarea'}</h4>
        
        <!-- Información básica de la tarea -->
        <div class="ch-row ch-mb-3" style="width:95%;">
          <div class="ch-col-md-6 ch-mb-3">
            <label class="ch-form-label">Nombre de la tarea</label>
            <input type="text" id="taskName" class="ch-form-control" 
                   placeholder="Ej: Generar resumen, Crear hilo" value="${taskName}">
          </div>
          <div class="ch-col-md-3 ch-mb-3">
            <label class="ch-form-label">Orden</label>
            <input type="number" id="taskOrder" class="ch-form-control" value="${taskOrder}" min="0">
          </div>
          <div class="ch-col-md-3 ch-mb-3 ch-d-flex ch-align-items-end">
            <div class="ch-form-check">
              <input type="checkbox" class="ch-form-check-input" id="taskActive" ${isActive ? 'checked' : ''}>
              <label class="ch-form-check-label" for="taskActive">Activa</label>
            </div>
          </div>
        </div>
        
        <div class="ch-mb-3">
          <label class="ch-form-label">Descripción</label>
          <input type="text" id="taskDescription" class="ch-form-control" 
                 placeholder="Describe qué hace esta tarea" value="${taskDescription}">
        </div>

        <!-- Prompt de la tarea -->
        <div class="ch-mb-4">
          <div class="ch-d-flex ch-justify-content-between ch-align-items-center ch-mb-2">
            <label class="ch-form-label ch-m-0">Prompt de la Tarea</label>
            <small class="ch-text-muted">Usa {{input_text}} para el contenido del usuario</small>
          </div>
          <textarea 
            id="taskPrompt" 
            class="ch-form-control" 
            rows="10"
            style="width:95%; font-family: monospace;"
            placeholder="Escribe las instrucciones para procesar el contenido..."
          >${taskPrompt}</textarea>
          <small class="ch-text-muted ch-mt-1 ch-d-block">
            💡 Si no incluyes {{input_text}}, se agregará automáticamente al final
          </small>
        </div>

        <!-- Opciones adicionales -->
        <div class="ch-form-check ch-mb-3">
          <input type="checkbox" class="ch-form-check-input" id="taskUsesAttachments" ${usesAttachments ? 'checked' : ''}>
          <label class="ch-form-check-label" for="taskUsesAttachments">
            <strong>Permite archivos adjuntos</strong>
          </label>
          <small class="ch-text-muted ch-d-block">
            Los usuarios podrán subir archivos para complementar esta tarea
          </small>
        </div>

        <!-- Botones de acción -->
        <div class="ch-d-flex ch-gap-2">
          <button id="saveTaskBtn" class="ch-btn ch-btn-primary ch-flex-grow-1">
            ${isCreating ? 'Crear Tarea' : 'Guardar Cambios'}
          </button>
          ${!isCreating ? `
            <button id="duplicateTaskBtn" class="ch-btn ch-btn-outline-primary">
              📋 Duplicar
            </button>
            <button id="deleteTaskBtn" class="ch-btn ch-btn-outline-danger">
              🗑️ Eliminar
            </button>
          ` : ''}
          <button id="cancelTaskBtn" class="ch-btn ch-btn-secondary">
            Cancelar
          </button>
        </div>
      </div>
    `;
    
    // Event listeners
    document.getElementById('saveTaskBtn').addEventListener('click', handleSaveTask);
    document.getElementById('cancelTaskBtn').addEventListener('click', handleCancelTask);
    
    if (!isCreating) {
      document.getElementById('duplicateTaskBtn').addEventListener('click', handleDuplicateTask);
      document.getElementById('deleteTaskBtn').addEventListener('click', handleDeleteTask);
    }
    
    taskEditorSection.style.display = 'block';
  }

  async function handleSaveTask() {
    const name = document.getElementById('taskName').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    let prompt = document.getElementById('taskPrompt').value.trim();
    const order = parseInt(document.getElementById('taskOrder').value) || 0;
    const usesAttachments = document.getElementById('taskUsesAttachments').checked;
    const isActive = document.getElementById('taskActive').checked;
    
    // Validaciones
    if (!name) {
      showStatus('El nombre es requerido', 'error');
      return;
    }
    
    if (!prompt) {
      showStatus('El prompt es requerido', 'error');
      return;
    }
    
    // Auto-agregar {{input_text}} si no está presente
    if (!prompt.includes('{{input_text}}')) {
      prompt += '\n\n{{input_text}}';
    }
    
    try {
      showStatus(isCreatingNewTask ? 'Creando tarea...' : 'Guardando cambios...', 'info');
      
      const taskData = {
        name: name,
        description: description,
        prompt: prompt,
        order: order,
        uses_attachements: usesAttachments,
        is_active: isActive
      };
      
      if (isCreatingNewTask) {
        taskData.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        await sendToBackground({
          action: 'createTask',
          taskData: taskData
        });
        showStatus('Tarea creada exitosamente', 'success');
      } else {
        await sendToBackground({
          action: 'updateTask',
          taskId: currentTask.id,
          updateData: taskData
        });
        showStatus('Cambios guardados exitosamente', 'success');
      }
      
      await loadTasks();
      handleCancelTask();
      
    } catch (error) {
      showStatus('Error al guardar: ' + error.message, 'error');
    }
  }

  async function handleDuplicateTask() {
    if (!currentTask) return;
    
    const newTask = {
      ...currentTask,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: currentTask.name + ' (Copia)',
      is_active: false
    };
    
    try {
      showStatus('Duplicando tarea...', 'info');
      await sendToBackground({
        action: 'createTask',
        taskData: newTask
      });
      showStatus('Tarea duplicada exitosamente', 'success');
      await loadTasks();
      handleCancelTask();
    } catch (error) {
      showStatus('Error al duplicar: ' + error.message, 'error');
    }
  }

  async function handleDeleteTask() {
    if (!currentTask) return;
    
    if (!confirm(`¿Estás seguro de eliminar la tarea "${currentTask.name}"?`)) {
      return;
    }
    
    try {
      showStatus('Eliminando tarea...', 'info');
      
      // Filtrar la tarea eliminada
      const updatedTasks = allTasks.filter(t => t.id !== currentTask.id);
      await sendToBackground({
        action: 'setTasks', // Necesitamos agregar esta acción al background
        tasks: updatedTasks
      });
      
      showStatus('Tarea eliminada exitosamente', 'success');
      await loadTasks();
      handleCancelTask();
    } catch (error) {
      showStatus('Error al eliminar: ' + error.message, 'error');
    }
  }

  function handleCancelTask() {
    taskTypeSelect.value = '';
    taskEditorSection.style.display = 'none';
    currentTask = null;
    isCreatingNewTask = false;
  }

  // IMPORTAR/EXPORTAR TAREAS
  async function handleExportTasks() {
    try {
      const tasks = await sendToBackground({ action: 'getAvailableTaskTypes' });
      
      const exportData = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        tasks: tasks
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `asistente-ia-tareas-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      showStatus('Tareas exportadas exitosamente', 'success');
    } catch (error) {
      showStatus('Error al exportar: ' + error.message, 'error');
    }
  }

  function handleImportTasks() {
    importFile.click();
  }

  async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      showStatus('Importando tareas...', 'info');
      
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (!importData.tasks || !Array.isArray(importData.tasks)) {
        throw new Error('Archivo de importación inválido');
      }
      
      if (!confirm(`¿Importar ${importData.tasks.length} tareas? Esto reemplazará todas las tareas actuales.`)) {
        return;
      }
      
      // Validar y limpiar tareas importadas
      const cleanedTasks = importData.tasks.map(task => ({
        id: task.id || Date.now().toString() + Math.random().toString(36).substr(2, 5),
        name: task.name || 'Tarea sin nombre',
        description: task.description || '',
        prompt: task.prompt || 'Procesa el siguiente contenido:\n\n{{input_text}}',
        uses_attachements: !!task.uses_attachements,
        can_execute: true,
        is_active: task.is_active !== false,
        order: task.order || 0
      }));
      
      await sendToBackground({
        action: 'setTasks',
        tasks: cleanedTasks
      });
      
      showStatus(`${cleanedTasks.length} tareas importadas exitosamente`, 'success');
      await loadTasks();
      
    } catch (error) {
      showStatus('Error al importar: ' + error.message, 'error');
    } finally {
      importFile.value = '';
    }
  }

  async function handleResetTasks() {
    if (!confirm('¿Restablecer todas las tareas a las configuraciones por defecto? Esto eliminará todas las tareas personalizadas.')) {
      return;
    }
    
    try {
      showStatus('Restableciendo tareas...', 'info');
      
      // Eliminar tareas actuales
      await chrome.storage.local.remove(['localTasks']);
      
      // Recargar tareas por defecto
      await loadTasks();
      
      showStatus('Tareas restablecidas a configuración por defecto', 'success');
    } catch (error) {
      showStatus('Error al restablecer: ' + error.message, 'error');
    }
  }

  // UTILIDADES
  function showStatus(message, type = 'info') {
    if (!statusMessage) return;
    
    statusMessage.textContent = message;
    statusMessage.className = `ch-alert ch-alert-${type} ch-mt-3`;
    statusMessage.style.display = 'block';
  }

  function hideStatus() {
    if (statusMessage) {
      statusMessage.style.display = 'none';
    }
  }

  // EVENT LISTENERS
  updateApiKeyBtn.addEventListener('click', handleUpdateApiKey);
  document.getElementById('openAIKeysLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://platform.openai.com/api-keys' });
  });
  
  exportTasksBtn.addEventListener('click', handleExportTasks);
  importTasksBtn.addEventListener('click', handleImportTasks);
  resetTasksBtn.addEventListener('click', handleResetTasks);
  importFile.addEventListener('change', handleFileImport);
  
  createNewTaskBtn.addEventListener('click', () => {
    showTaskEditor(null, true);
  });

  taskTypeSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      const taskData = JSON.parse(e.target.selectedOptions[0].dataset.task);
      showTaskEditor(taskData, false);
    } else {
      handleCancelTask();
    }
  });

  // INICIALIZACIÓN
  await loadApiKeyStatus();
  await loadTasks();
});