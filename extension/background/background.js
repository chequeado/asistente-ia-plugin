// background/background.js - VERSIÓN LOCAL CON OPENAI API DIRECTA - SEGURA

// Configuración OpenAI
const OPENAI_API_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-5';

// Lista de acciones permitidas para validación
const ALLOWED_ACTIONS = [
  'setApiKey', 'getApiKey', 'checkApiKey', 'clearApiKey',
  'getAvailableTaskTypes', 'updateTask', 'createTask', 'setTasks',
  'createTaskExecution', 'executeTask', 'getTaskStatus', 'refineTask',
  'uploadAttachment', 'fetchDocContent'
];

class LocalStorageService {
  async setApiKey(apiKey) {
    await chrome.storage.local.set({ openaiApiKey: apiKey });
  }
  
  async getApiKey() {
    const result = await chrome.storage.local.get(['openaiApiKey']);
    return result.openaiApiKey;
  }
  
  async clearApiKey() {
    await chrome.storage.local.remove(['openaiApiKey']);
  }
  
  async setTasks(tasks) {
    await chrome.storage.local.set({ localTasks: tasks });
  }
  
  async getTasks() {
    const result = await chrome.storage.local.get(['localTasks']);
    if (result.localTasks) {
      return result.localTasks;
    }
    
    // Si no hay tareas guardadas, cargar las por defecto
    return await this.loadDefaultTasks();
  }
  
  async loadDefaultTasks() {
    try {
      const response = await fetch(chrome.runtime.getURL('tasks/tasks.json'));
      const data = await response.json();
      
      // Transformar formato del archivo JSON al formato esperado
      const transformedTasks = data.tasks.map(task => ({
        id: task.id,
        name: task.name,
        description: task.description,
        prompt: task.prompt,
        uses_attachements: task.requiresAttachments || false,
        can_execute: true,
        is_active: true,
        order: 0
      }));
      
      // Guardar tareas por defecto
      await this.setTasks(transformedTasks);
      return transformedTasks;
    } catch (error) {
      console.error('Error loading default tasks:', error);
      return [];
    }
  }
}

class OpenAIService {
  constructor() {
    this.baseURL = OPENAI_API_URL;
    this.model = DEFAULT_MODEL;
  }
  
  async makeRequest(endpoint, options = {}) {
    const apiKey = await localStorageService.getApiKey();
    if (!apiKey) {
      throw new Error('API Key de OpenAI no configurada');
    }
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async uploadFile(fileData) {
    const apiKey = await localStorageService.getApiKey();
    if (!apiKey) {
      throw new Error('API Key de OpenAI no configurada');
    }
    
    const formData = new FormData();
    const file = new File([new Uint8Array(fileData.data)], fileData.name, { 
      type: fileData.type || 'application/octet-stream' 
    });
    formData.append('file', file);
    formData.append('purpose', 'assistants');
    
    const response = await fetch(`${this.baseURL}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Error al subir archivo');
    }
    
    return response.json();
  }
  
  async createChatCompletion(messages, attachmentFileIds = []) {
    // Preparar mensajes con archivos si los hay
    const processedMessages = [...messages];
    
    if (attachmentFileIds.length > 0 && processedMessages.length > 0) {
      // Agregar referencias a archivos en el último mensaje del usuario
      const lastMessage = processedMessages[processedMessages.length - 1];
      if (lastMessage.role === 'user') {
        lastMessage.content = [
          { type: 'text', text: lastMessage.content },
          ...attachmentFileIds.map(fileId => ({
            type: 'file',
            file_id: fileId
          }))
        ];
      }
    }
    
    const requestBody = {
      model: this.model,
      messages: processedMessages
    };
    
    return this.makeRequest('/chat/completions', {
      body: JSON.stringify(requestBody)
    });
  }
}

class TaskExecutionService {
  constructor() {
    this.executions = new Map(); // Almacenar ejecuciones en memoria
  }
  
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
  
  createExecution(taskId, title, inputText, attachmentIds = []) {
    const executionId = this.generateId();
    const execution = {
      id: executionId,
      task_id: taskId,
      title: title,
      input_text: inputText,
      attachment_ids: attachmentIds,
      output_text: null,
      has_output: false,
      status: 'created',
      created_at: new Date().toISOString()
    };
    
    this.executions.set(executionId, execution);
    return execution;
  }
  
  getExecution(executionId) {
    return this.executions.get(executionId);
  }
  
  updateExecution(executionId, updates) {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error('Ejecución no encontrada');
    }
    
    Object.assign(execution, updates);
    this.executions.set(executionId, execution);
    return execution;
  }
  
  async executeTask(executionId) {
    const execution = this.getExecution(executionId);
    if (!execution) {
      throw new Error('Ejecución no encontrada');
    }
    
    // Buscar la tarea
    const tasks = await localStorageService.getTasks();
    const task = tasks.find(t => t.id === execution.task_id);
    if (!task) {
      throw new Error('Tarea no encontrada');
    }
    
    try {
      this.updateExecution(executionId, { status: 'running' });
      
      // Procesar el prompt reemplazando variables
      let processedPrompt = task.prompt;
      
      // Reemplazar {{input_text}} con el contenido
      processedPrompt = processedPrompt.replace(/\{\{input_text\}\}/g, execution.input_text);
      
      // Construir mensajes para OpenAI
      const messages = [
        {
          role: 'system',
          content: 'Eres un asistente especializado para periodistas y verificadores de hechos. Responde siempre en HTML válido sin usar bloques de código markdown.'
        },
        {
          role: 'user',
          content: processedPrompt
        }
      ];
      
      // Llamar a OpenAI
      const response = await openAIService.createChatCompletion(messages, execution.attachment_ids);
      
      const outputText = response.choices[0]?.message?.content || 'Sin respuesta';
      
      this.updateExecution(executionId, {
        output_text: outputText,
        has_output: true,
        status: 'completed'
      });
      
      return this.getExecution(executionId);
      
    } catch (error) {
      console.error('Error ejecutando tarea:', error);
      this.updateExecution(executionId, {
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }
  
  async refineExecution(executionId, refinementRequest) {
    const execution = this.getExecution(executionId);
    if (!execution || !execution.has_output) {
      throw new Error('Ejecución no encontrada o sin resultado previo');
    }
    
    try {
      // Crear mensaje de refinamiento
      const messages = [
        {
          role: 'system',
          content: 'Eres un asistente especializado. Modifica el contenido anterior según la solicitud del usuario. Responde en HTML válido.'
        },
        {
          role: 'user',
          content: `Contenido anterior:\n${execution.output_text}\n\nSolicitud de cambio: ${refinementRequest}`
        }
      ];
      
      const response = await openAIService.createChatCompletion(messages);
      const refinedText = response.choices[0]?.message?.content || execution.output_text;
      
      this.updateExecution(executionId, {
        output_text: refinedText,
        refined_at: new Date().toISOString()
      });
      
      return this.getExecution(executionId);
      
    } catch (error) {
      console.error('Error refinando resultado:', error);
      throw error;
    }
  }
}

// Inicializar servicios
const localStorageService = new LocalStorageService();
const openAIService = new OpenAIService();
const taskExecutionService = new TaskExecutionService();

// VALIDACIÓN DE SEGURIDAD - CORRIGE VULNERABILIDAD #2
function isValidSender(sender) {
  // Validar que el mensaje viene de la extensión
  if (!sender || !sender.id) return false;
  
  // Verificar que es nuestra extensión
  if (sender.id !== chrome.runtime.id) return false;
  
  // Si viene de una pestaña, verificar que es una URL válida
  if (sender.tab && sender.tab.url) {
    const url = new URL(sender.tab.url);
    // Permitir solo http/https/file
    const allowedProtocols = ['http:', 'https:', 'file:'];
    if (!allowedProtocols.includes(url.protocol)) return false;
  }
  
  return true;
}

function isValidAction(action) {
  return ALLOWED_ACTIONS.includes(action);
}

// Manejar mensajes con validación de seguridad
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  // CORRECCIÓN VULNERABILIDAD #2: Validar origen del mensaje
  if (!isValidSender(sender)) {
    console.warn('Mensaje rechazado: origen no válido', sender);
    sendResponse({ error: 'Origen no autorizado' });
    return false;
  }
  
  // Validar que la acción está permitida
  if (!message || !message.action || !isValidAction(message.action)) {
    console.warn('Acción no válida:', message?.action);
    sendResponse({ error: 'Acción no autorizada' });
    return false;
  }
  
  handleMessage(message, sender).then(sendResponse).catch(error => {
    console.error('Error manejando mensaje:', error);
    sendResponse({ error: error.message });
  });
  
  return true;
});

async function handleMessage(message, sender) {
  switch (message.action) {
    // Manejo de API Key
    case 'setApiKey':
      await localStorageService.setApiKey(message.apiKey);
      return { success: true };
      
    case 'getApiKey':
      const apiKey = await localStorageService.getApiKey();
      return { apiKey: apiKey || null };
      
    case 'checkApiKey':
      const hasApiKey = !!(await localStorageService.getApiKey());
      return { hasApiKey };
      
    case 'clearApiKey':
      await localStorageService.clearApiKey();
      return { success: true };
      
    // Manejo de tareas
    case 'getAvailableTaskTypes':
      const tasks = await localStorageService.getTasks();
      return tasks;
      
    case 'updateTask':
      const allTasks = await localStorageService.getTasks();
      const taskIndex = allTasks.findIndex(t => t.id === message.taskId);
      if (taskIndex !== -1) {
        Object.assign(allTasks[taskIndex], message.updateData);
        await localStorageService.setTasks(allTasks);
        return allTasks[taskIndex];
      }
      throw new Error('Tarea no encontrada');
      
    case 'createTask':
      const existingTasks = await localStorageService.getTasks();
      const newTask = {
        id: message.taskData.id || Date.now().toString(),
        name: message.taskData.name,
        description: message.taskData.description,
        prompt: message.taskData.prompt,
        uses_attachements: message.taskData.uses_attachements || false,
        can_execute: true,
        is_active: true,
        order: message.taskData.order || 0
      };
      existingTasks.push(newTask);
      await localStorageService.setTasks(existingTasks);
      return newTask;
      
    case 'setTasks':
      await localStorageService.setTasks(message.tasks);
      return { success: true };
      
    // Ejecución de tareas
    case 'createTaskExecution':
      const execution = taskExecutionService.createExecution(
        message.taskTypeId,
        message.title,
        message.inputText,
        message.attachmentIds
      );
      return execution;
      
    case 'executeTask':
      return await taskExecutionService.executeTask(message.taskExecutionId);
      
    case 'getTaskStatus':
      const status = taskExecutionService.getExecution(message.taskExecutionId);
      if (!status) {
        throw new Error('Ejecución no encontrada');
      }
      return status;
      
    case 'refineTask':
      return await taskExecutionService.refineExecution(
        message.taskExecutionId,
        message.refinementRequest
      );
      
    case 'uploadAttachment':
      const uploadResult = await openAIService.uploadFile(message.fileData);
      return { file_id: uploadResult.id };
      
    // Otros
    case 'fetchDocContent':
      const response = await fetch(message.url);
      const html = await response.text();
      return { html };
      
    default:
      throw new Error(`Unknown action: ${message.action}`);
  }
}

// Setup inicial
chrome.runtime.onInstalled.addListener(function(details) {
  console.log("Asistente IA instalado o actualizado", details.reason);
  
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});