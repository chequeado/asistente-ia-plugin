// content/content.js - VERSIÓN LOCAL OPTIMIZADA

// Variables globales
let currentTaskExecutionId = null;
let currentTaskType = null;
let currentInputText = '';
let uploadedAttachmentIds = [];

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'ping') {
    sendResponse({status: 'alive'});
    return;
  }
  
  if (message.action === 'checkSelection') {
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().trim().length > 0;
    sendResponse({hasSelection: hasSelection});
    return;
  }
  
  if (message.action === 'processWithBackend') {
    processDocumentLocal(message.taskType, message.taskIcon, message.useSelectedText || false);
    sendResponse({status: 'success'});
    return;
  }
});

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

// FUNCIÓN PRINCIPAL - Procesar documento (versión local)
async function processDocumentLocal(taskType, taskIcon, useSelectedText = false) {
  showLoadingInterface(taskType.name, taskIcon);
  
  try {
    let documentContent;
    
    if (useSelectedText) {
      documentContent = extractSelectedText();
      if (!documentContent) {
        throw new Error('No hay texto seleccionado');
      }
    } else {
      documentContent = await extractPageContent();
    }
    
    // Preparar contenido con instrucciones HTML
    const contentWithHtmlInstruction = documentContent + '\n\n---\nIMPORTANTE: Por favor, formatea tu respuesta en HTML válido sin etiquetas de código markdown (sin ```html o ```). Usa etiquetas HTML semánticas apropiadas como <p>, <ul>, <ol>, <li>, <strong>, <em>, <h3>, <h4>, <blockquote>, etc. El resultado debe ser HTML puro listo para renderizar.';
    
    // Guardar datos para uso posterior
    currentInputText = contentWithHtmlInstruction;
    currentTaskType = taskType;
    
    if (taskType.uses_attachements) {
      // NO crear task execution todavía, solo mostrar modal
      hideLoadingInterface();
      showAttachmentInterface(taskType.name, taskIcon);
    } else {
      // Crear y ejecutar task execution inmediatamente
      const taskExecution = await sendToBackground({
        action: 'createTaskExecution',
        taskTypeId: taskType.id,
        title: `${taskType.name} - ${new Date().toLocaleString()}`,
        inputText: contentWithHtmlInstruction,
        attachmentIds: []
      });
      
      currentTaskExecutionId = taskExecution.id;
      await executeTaskLocal(taskExecution.id, taskType.name, taskIcon);
    }
    
  } catch (error) {
    console.error('Error processing document:', error);
    hideLoadingInterface();
    showErrorMessage(error.message);
  }
}

// NUEVA FUNCIÓN - Crear y ejecutar tarea con texto adicional (versión local)
async function createAndExecuteTaskLocal(taskName, taskIcon) {
  const additionalText = document.getElementById('additional-text')?.value.trim();
  
  // Preparar input text final
  let finalInputText = currentInputText;
  
  if (additionalText) {
    finalInputText += '\n\n----------------------\n**Contexto adicional para la ejecución de la tarea:**\n' + additionalText;
  }
  
  // Procesar archivos adjuntos si los hay
  const attachmentFiles = document.querySelectorAll('[data-file-data]');
  const attachmentIds = [];
  
  try {
    showLoadingInterface(taskName, taskIcon);
    
    // Subir archivos primero
    for (const fileElement of attachmentFiles) {
      const fileData = JSON.parse(fileElement.dataset.fileData);
      const uploadResult = await sendToBackground({
        action: 'uploadAttachment',
        taskExecutionId: null, // No necesitamos ID específico para versión local
        fileData: fileData
      });
      attachmentIds.push(uploadResult.file_id);
    }
    
    // Crear task execution con el texto completo y archivos
    const taskExecution = await sendToBackground({
      action: 'createTaskExecution',
      taskTypeId: currentTaskType.id,
      title: `${currentTaskType.name} - ${new Date().toLocaleString()}`,
      inputText: finalInputText,
      attachmentIds: attachmentIds
    });
    
    currentTaskExecutionId = taskExecution.id;
    uploadedAttachmentIds = attachmentIds;
    
    // Ejecutar inmediatamente
    await executeTaskLocal(taskExecution.id, taskName, taskIcon);
    
  } catch (error) {
    hideLoadingInterface();
    showErrorMessage(error.message);
  }
}

// MODAL DE ATTACHMENTS CON TEXTO ADICIONAL (versión local)
function showAttachmentInterface(taskName, taskIcon) {
  removeAllContainers();
  
  const attachmentContainer = document.createElement('div');
  attachmentContainer.id = 'chequeabot-attachment-container';
  attachmentContainer.className = 'ch-extension ch-overlay ch-card ch-slide-up';
  
  attachmentContainer.innerHTML = `
    <div class="ch-card-header ch-draggable ch-d-flex ch-justify-content-between ch-align-items-center">
      <div class="ch-d-flex ch-align-items-center">
        <span class="ch-m-2">${taskIcon}</span>
        <h4 class="ch-m-0">${taskName}</h4>
      </div>
      <button id="close-attachment" class="ch-btn ch-text-white" style="background: none; border: none; font-size: 1.5rem; line-height: 1; padding: 0;">
        ×
      </button>
    </div>
    <div class="ch-card-body">
      <div class="ch-mb-3">
        <label class="ch-form-label ch-text-sm">💬 Contexto adicional</label>
        <textarea 
          id="additional-text" 
          class="ch-form-control" 
          rows="3"
          style="width:95%;"
          placeholder="Puedes agregar información adicional, instrucciones específicas o contexto que complemente la tarea"
        ></textarea>
      </div>

      <div class="ch-form-control ch-text-center ch-p-3 ch-mb-3" 
           id="file-drop-area" 
           style="border: 2px dashed var(--ch-border-color); cursor: pointer; transition: var(--ch-transition);">
        <p class="ch-mb-1 ch-mt-0 ch-font-weight-bold">📎 Arrastra archivos aquí</p>
        <p class="ch-m-0 ch-text-muted ch-text-sm">o haz clic para seleccionar</p>
        <p class="ch-m-0 ch-text-muted ch-text-sm">Formatos: PDF, TXT, DOC, DOCX, etc.</p>
      </div>
      
      <div id="attachments-list" class="ch-mb-3 ch-mt-0" style="max-height: 150px; overflow-y: auto;">
        <div id="no-attachments-msg" class="ch-text-center ch-p-2 ch-text-muted ch-text-sm">
          No hay archivos adjuntos
        </div>
      </div>
      
      <div class="ch-d-flex ch-gap-2">
        <button id="execute-with-attachments-btn" class="ch-btn ch-btn-primary ch-flex-grow-1">
          Ejecutar Tarea
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(attachmentContainer);
  
  // Event listeners
  document.getElementById('close-attachment').addEventListener('click', () => {
    removeAllContainers();
  });
  
  document.getElementById('execute-with-attachments-btn').addEventListener('click', () => {
    createAndExecuteTaskLocal(taskName, taskIcon);
  });
  
  // File upload functionality
  const fileDropArea = document.getElementById('file-drop-area');
  setupFileUpload(fileDropArea);
  
  makeDraggable(attachmentContainer);
}

// SISTEMA DE EJECUCIÓN SIMPLIFICADO (versión local)
async function executeTaskLocal(taskExecutionId, taskName, taskIcon) {
  try {
    showLoadingInterface(taskName, taskIcon);
    
    console.log('Ejecutando tarea local...');
    const result = await sendToBackground({
      action: 'executeTask',
      taskExecutionId: taskExecutionId
    });
    
    console.log('Tarea ejecutada exitosamente');
    
    hideLoadingInterface();
    showResultInterface(result, taskName, taskIcon);
    
  } catch (error) {
    console.error('Error ejecutando tarea:', error);
    hideLoadingInterface();
    
    if (error.message && (
        error.message.includes('insufficient_quota') || 
        error.message.includes('API Key') ||
        error.message.includes('rate_limit')
      )) {
      showApiErrorMessage(error.message);
    } else {
      showErrorMessage(error.message);
    }
  }
}

// INTERFAZ DE RESULTADOS CON REFINAMIENTO (versión local)
function showResultInterface(taskData, taskName, taskIcon) {
  removeAllContainers();
  
  const resultContainer = document.createElement('div');
  resultContainer.id = 'chequeabot-result-container';
  resultContainer.className = 'ch-extension ch-overlay ch-slide-up ch-result-content';
  resultContainer.style.cssText = 'height: 60vh; display: flex; flex-direction: column;';
  
  // Obtener texto de salida
  let outputText = taskData.output_text || taskData.result || taskData.generated_content || 'Sin resultado';
  
  console.log('Mostrando resultado:', outputText ? outputText.substring(0, 100) + '...' : 'Sin contenido');
  
  resultContainer.innerHTML = `
    <div class="ch-card-header ch-draggable ch-d-flex ch-justify-content-between ch-align-items-center">
      <div class="ch-d-flex ch-align-items-center">
        <span class="ch-text-base ch-me-2">${taskIcon || '✨'}</span>
        <h3 class="ch-m-0 ch-text-base">${taskName}</h3>
      </div>
      <div class="ch-d-flex ch-gap-2">
        <button id="copy-result" class="ch-btn ch-btn-sm ch-btn-outline-primary">
          Copiar
        </button>
        <button id="close-result" class="ch-btn ch-btn-sm ch-text-white" style="background: transparent; border: none; font-size: 1.5rem; line-height: 1; padding: 0;">
          ×
        </button>
      </div>
    </div>
    <div class="ch-card-body" style="flex: 1; overflow-y: auto;">
      <div class="ch-text-primary">
        ${outputText.replace(/```html/g, "").replace(/```/g, "")}
      </div>
    </div>
    <div style="flex-shrink: 0;">
      <div class="ch-p-3 ch-bg-light">
        <input type="text" id="refine-input" class="ch-form-control ch-mb-2" 
               placeholder="Pide correcciones o cambios específicos al contenido">
        <button id="refine-btn" class="ch-btn ch-btn-primary ch-btn-block ch-btn-sm">
          ✨ Refinar Resultado
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(resultContainer);
  
  // Event listeners
  document.getElementById('copy-result').addEventListener('click', async () => {
    try {
      await copyRichText(outputText);
      
      const btn = document.getElementById('copy-result');
      btn.textContent = '¡Copiado!';
      btn.style.backgroundColor = '#28a745';
      btn.style.color = 'white';
      
      setTimeout(() => {
        btn.textContent = 'Copiar';
        btn.style.backgroundColor = '';
        btn.style.color = '';
      }, 2000);
      
    } catch (error) {
      console.error('Error al copiar:', error);
      
      const btn = document.getElementById('copy-result');
      btn.textContent = 'Error';
      btn.style.backgroundColor = '#dc3545';
      btn.style.color = 'white';
      
      setTimeout(() => {
        btn.textContent = 'Copiar';
        btn.style.backgroundColor = '';
        btn.style.color = '';
      }, 2000);
    }
  });

  document.getElementById('close-result').addEventListener('click', () => {
    removeAllContainers();
  });
  
  document.getElementById('refine-btn').addEventListener('click', async () => {
    const refineInput = document.getElementById('refine-input');
    const refinementRequest = refineInput.value.trim();
    
    if (!refinementRequest) {
      refineInput.focus();
      refineInput.placeholder = "Por favor, describe qué quieres cambiar";
      refineInput.style.borderColor = '#dc3545';
      setTimeout(() => {
        refineInput.style.borderColor = '';
        refineInput.placeholder = "Pide correcciones o cambios específicos al contenido";
      }, 3000);
      return;
    }
    
    try {
      showLoadingInterface('Refinando resultado', '🔄');
      
      const refinedResult = await sendToBackground({
        action: 'refineTask',
        taskExecutionId: currentTaskExecutionId,
        refinementRequest: refinementRequest
      });
      
      hideLoadingInterface();
      showResultInterface(refinedResult, taskName, taskIcon);
      
    } catch (error) {
      hideLoadingInterface();
      
      if (error.message && (
          error.message.includes('insufficient_quota') || 
          error.message.includes('API Key') ||
          error.message.includes('rate_limit')
        )) {
        showApiErrorMessage(error.message);
      } else {
        showErrorMessage(error.message);
      }
    }
  });
  
  makeDraggable(resultContainer);
}

async function copyRichText(htmlContent) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  const plainText = tempDiv.textContent || tempDiv.innerText || '';
  
  try {
    const clipboardItem = new ClipboardItem({
      'text/html': new Blob([htmlContent], { type: 'text/html' }),
      'text/plain': new Blob([plainText], { type: 'text/plain' })
    });
    
    await navigator.clipboard.write([clipboardItem]);
  } catch (error) {
    // Fallback a texto plano si falla el HTML
    await navigator.clipboard.writeText(plainText);
  }
}

// FILE UPLOAD SETUP MEJORADO (versión local)
function setupFileUpload(dropArea) {
  uploadedAttachmentIds = []; // Reset
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.style.borderColor = 'var(--ch-primary)';
      dropArea.style.backgroundColor = 'rgba(13, 110, 253, 0.05)';
    });
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.style.borderColor = 'var(--ch-border-color)';
      dropArea.style.backgroundColor = 'transparent';
    });
  });
  
  dropArea.addEventListener('drop', handleDrop);
  dropArea.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.txt,.doc,.docx,.json,.csv';
    input.onchange = (e) => handleFiles(e.target.files);
    input.click();
  });
  
  function handleDrop(e) {
    const files = e.dataTransfer.files;
    handleFiles(files);
  }
  
  async function handleFiles(files) {
    const attachmentsList = document.getElementById('attachments-list');
    const noAttachmentsMsg = document.getElementById('no-attachments-msg');
    
    for (const file of files) {
      // Leer el archivo como ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        data: Array.from(uint8Array) // Convertir para serialización
      };
      
      // Mostrar archivo en la lista
      const fileDiv = document.createElement('div');
      fileDiv.className = 'ch-p-2 ch-bg-light ch-mb-1 ch-text-sm';
      fileDiv.style.borderRadius = 'var(--ch-border-radius-sm)';
      fileDiv.dataset.fileData = JSON.stringify(fileData);
      fileDiv.innerHTML = `
        <div class="ch-d-flex ch-justify-content-between ch-align-items-center">
          <span class="ch-text-success">📎 ${file.name} (${formatFileSize(file.size)})</span>
          <button class="ch-btn ch-btn-sm ch-text-danger" 
                  onclick="this.parentElement.parentElement.remove(); updateAttachmentsVisibility()"
                  style="background: none; border: none; padding: 0.25rem;">
            ×
          </button>
        </div>
      `;
      
      if (noAttachmentsMsg) {
        noAttachmentsMsg.style.display = 'none';
      }
      attachmentsList.appendChild(fileDiv);
    }
  }
  
  // Función global para actualizar visibilidad
  window.updateAttachmentsVisibility = function() {
    const attachmentsList = document.getElementById('attachments-list');
    const noAttachmentsMsg = document.getElementById('no-attachments-msg');
    const hasFiles = attachmentsList.querySelectorAll('[data-file-data]').length > 0;
    
    if (noAttachmentsMsg) {
      noAttachmentsMsg.style.display = hasFiles ? 'none' : 'block';
    }
  };
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// FUNCIONES DE EXTRACCIÓN DE CONTENIDO (sin cambios)
function extractSelectedText() {
  const selection = window.getSelection();
  
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  
  const selectedText = selection.toString().trim();
  
  if (!selectedText) {
    return null;
  }
  
  return selectedText;
}

async function extractPageContent() {
  const currentUrl = window.location.href;
  
  if (currentUrl.includes('docs.google.com/document')) {
    try {
      return await extractGoogleDocContent();
    } catch (error) {
      console.warn('Error extrayendo contenido de Google Docs, usando método general:', error);
      return extractGeneralPageContent();
    }
  }
  
  return extractGeneralPageContent();
}

function extractGeneralPageContent() {
  let content = '';
  
  const mainSelectors = [
    'main', '[role="main"]', '.main-content', '.content', '.post-content',
    '.entry-content', '.article-content', 'article', '.story-body', '.article-body'
  ];
  
  for (const selector of mainSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      content = extractTextFromElement(element);
      if (content.length > 100) {
        console.log(`Contenido extraído usando selector: ${selector}`);
        return content;
      }
    }
  }
  
  console.log('Usando contenido filtrado del body');
  return extractTextFromElement(document.body);
}

function extractTextFromElement(element) {
  const clone = element.cloneNode(true);
  
  const selectorsToRemove = [
    'script', 'style', 'nav', 'header', 'footer', '.advertisement', '.ads',
    '.sidebar', '.menu', '.navigation', '.social-share', '.comments',
    '.related-posts', '[class*="ad-"]', '[id*="ad-"]'
  ];
  
  selectorsToRemove.forEach(selector => {
    const elements = clone.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });
  
  let text = clone.innerText || clone.textContent || '';
  
  text = text.replace(/\s+/g, ' ')
             .replace(/\n\s*\n/g, '\n\n')
             .trim();
  
  return text;
}

async function extractGoogleDocContent() {
  const url = window.location.href;
  const docIdMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  
  if (!docIdMatch || !docIdMatch[1]) {
    throw new Error('No se pudo extraer el ID del documento de la URL');
  }
  
  const docId = docIdMatch[1];
  const mobileViewUrl = `https://docs.google.com/document/d/${docId}/mobilebasic`;
  
  try {
    const response = await sendToBackground({
      action: 'fetchDocContent',
      url: mobileViewUrl
    });
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(response.html, 'text/html');
    
    const contentElements = doc.querySelectorAll('.doc-content');
    let content = '';
    
    if (contentElements.length > 0) {
      content = contentElements[0].innerHTML;
    } else {
      const bodyContent = doc.querySelector('body');
      if (bodyContent) {
        content = bodyContent.innerHTML;
      } else {
        throw new Error('No se pudo extraer el contenido del documento');
      }
    }
    
    return cleanHtmlStyles(content);
  } catch (error) {
    throw new Error(`Error al obtener el contenido del documento: ${error.message}`);
  }
}

function cleanHtmlStyles(htmlContent) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  const elementsWithStyle = tempDiv.querySelectorAll('[style]');
  elementsWithStyle.forEach(element => {
    element.removeAttribute('style');
  });
  
  const styleTags = tempDiv.querySelectorAll('style');
  styleTags.forEach(styleTag => {
    styleTag.remove();
  });
  
  return tempDiv.innerHTML;
}

// INTERFAZ DE LOADING Y MENSAJES (sin cambios mayores)
function showLoadingInterface(taskName, taskIcon) {
  removeAllContainers();
  
  const loadingContainer = document.createElement('div');
  loadingContainer.id = 'chequeabot-loading-container';
  loadingContainer.className = 'ch-extension ch-overlay ch-card ch-slide-up';
  
  loadingContainer.innerHTML = `
    <div class="ch-card-body ch-text-center">
      <div class="ch-d-flex ch-align-items-center ch-justify-content-center ch-mb-3">
        <span class="ch-text-base ch-mr-2">${taskIcon || '✨'}</span>
        <p class="ch-m-0 ch-font-weight-bold">Procesando: ${taskName}</p>
      </div>
      <div class="ch-spinner ch-spinner-sm ch-text-primary"></div>
      <p class="ch-mt-2 ch-mb-0 ch-text-sm ch-text-muted">Conectando con OpenAI...</p>
    </div>
  `;
  
  document.body.appendChild(loadingContainer);
  makeDraggable(loadingContainer);
}

function hideLoadingInterface() {
  const loadingContainer = document.getElementById('chequeabot-loading-container');
  if (loadingContainer) {
    loadingContainer.remove();
  }
}

function showApiErrorMessage(message) {
  removeAllContainers();
  
  const errorContainer = document.createElement('div');
  errorContainer.id = 'chequeabot-error-container';
  errorContainer.className = 'ch-extension ch-overlay ch-card ch-slide-up';
  
  let errorTitle = '🔴 Error de API';
  let errorAdvice = '';
  
  if (message.includes('insufficient_quota')) {
    errorTitle = '💳 Sin créditos disponibles';
    errorAdvice = '<p>• Revisa tu cuenta de OpenAI en platform.openai.com<br>• Agrega créditos o verifica tu plan de pago</p>';
  } else if (message.includes('invalid_api_key')) {
    errorTitle = '🔑 API Key inválida';
    errorAdvice = '<p>• Verifica que hayas copiado correctamente tu API Key<br>• Ve a Configuración para actualizarla</p>';
  } else if (message.includes('rate_limit')) {
    errorTitle = '⏱️ Límite de velocidad';
    errorAdvice = '<p>• Espera unos minutos e intenta nuevamente<br>• Considera actualizar tu plan de OpenAI</p>';
  }
  
  errorContainer.innerHTML = `
    <div class="ch-card-header ch-bg-danger ch-text-white ch-d-flex ch-justify-content-between ch-align-items-center">
      <h3 class="ch-m-0">${errorTitle}</h3>
      <button id="close-error" class="ch-btn ch-text-white" style="background: none; border: none; font-size: 1.5rem; line-height: 1; padding: 0;">
        ×
      </button>
    </div>
    <div class="ch-card-body">
      <div class="ch-alert ch-alert-danger ch-mb-3">
        <p class="ch-m-0 ch-font-weight-bold">${message}</p>
      </div>
      ${errorAdvice ? `
        <div class="ch-bg-light ch-p-3" style="border-radius: 0.375rem;">
          <h4 class="ch-mb-2">💡 Posibles soluciones:</h4>
          ${errorAdvice}
        </div>
      ` : ''}
    </div>
  `;
  
  document.body.appendChild(errorContainer);
  
  document.getElementById('close-error').addEventListener('click', () => {
    removeAllContainers();
  });
  
  makeDraggable(errorContainer);
}

function showErrorMessage(message) {
  removeAllContainers();
  
  const errorContainer = document.createElement('div');
  errorContainer.id = 'chequeabot-error-container';
  errorContainer.className = 'ch-extension ch-overlay ch-card ch-slide-up';
  
  errorContainer.innerHTML = `
    <div class="ch-card-header ch-bg-danger ch-text-white ch-d-flex ch-justify-content-between ch-align-items-center">
      <h3 class="ch-m-0">Error</h3>
      <button id="close-error" class="ch-btn ch-text-white" style="background: none; border: none; font-size: 1.5rem; line-height: 1; padding: 0;">
        ×
      </button>
    </div>
    <div class="ch-card-body">
      <div class="ch-alert ch-alert-danger ch-mb-0">
        <p class="ch-m-0">${message}</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(errorContainer);
  
  document.getElementById('close-error').addEventListener('click', () => {
    removeAllContainers();
  });
  
  makeDraggable(errorContainer);
}

// UTILIDADES (sin cambios)
function removeAllContainers() {
  const containers = [
    'chequeabot-loading-container',
    'chequeabot-attachment-container',
    'chequeabot-result-container',
    'chequeabot-error-container'
  ];
  
  containers.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.remove();
    }
  });
}

function makeDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  const header = element.querySelector('.ch-draggable');
  if (header) {
    header.style.cursor = 'move';
    header.onmousedown = dragMouseDown;
  } else {
    element.onmousedown = dragMouseDown;
  }
  
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }
  
  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
    element.style.right = "auto";
    element.style.bottom = "auto";
  }
  
  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}