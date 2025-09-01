# Asistente IA 

**Asistente con IA para periodistas y chequeadores**

Esta versión local funciona conectándose directamente con la API de OpenAI. Incluye todas las funcionalidades principales del asistente, incluyendo gestión y personalización de tareas.

## 🌟 Características

- ✅ **Gestión local de tareas** - Crea, edita y personaliza tareas
- ✅ **Importar/Exportar configuraciones** - Comparte tareas entre dispositivos
- ✅ **Soporte para archivos adjuntos** - PDFs, documentos, etc.
- ✅ **Refinamiento de resultados** - Mejora las respuestas iterativamente
- ✅ **Interfaz drag & drop** - Experiencia de usuario mejorada

## 🚀 Instalación

### 1. Descargar el código
```bash
git clone [tu-repositorio]
cd asistente-ia-plugin
```

### 2. Instalar la extensión
1. Abre Chrome y navega a `chrome://extensions/`
2. Activa el "Modo desarrollador" en la esquina superior derecha
3. Haz clic en "Cargar descomprimida" y selecciona la carpeta `prototype`
4. La extensión "Asistente IA" aparecerá en tu lista

### 3. Configurar OpenAI API Key
1. Obtén tu API Key en [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Haz clic en el icono de la extensión
3. Ingresa tu API Key en el formulario
4. La extensión validará la conexión automáticamente

## 📖 Uso

### Procesar contenido de páginas web
1. Ve a cualquier página web o documento
2. Opcionalmente selecciona texto específico
3. Haz clic en el icono de la extensión
4. Elige la tarea que quieres ejecutar
5. El resultado aparecerá en una ventana superpuesta

### Usar archivos adjuntos
1. Selecciona una tarea que soporte archivos
2. Arrastra archivos al área de drop o haz clic para seleccionar
3. Opcionalmente agrega contexto adicional
4. Ejecuta la tarea

### Gestionar tareas personalizadas
1. Ve a Configuración (⚙️)
2. Selecciona una tarea existente o crea una nueva
3. Configura el nombre, descripción y prompt
4. Guarda los cambios

## 🔧 Configuración Avanzada

### Crear nuevas tareas
Las tareas usan un sistema de plantillas simple:
- `{{input_text}}` - Contenido procesado de la página
- Prompt en lenguaje natural describiendo la tarea

Ejemplo:
```
Analiza el siguiente artículo periodístico y genera un resumen de 3 puntos principales:

{{input_text}}

Formato:
• Punto 1: [resumen]
• Punto 2: [resumen] 
• Punto 3: [resumen]
```

### Importar/Exportar tareas
- **Exportar**: Descarga un archivo JSON con todas tus tareas
- **Importar**: Carga tareas desde un archivo JSON
- **Restablecer**: Vuelve a las tareas por defecto

## 💡 Tipos de tarea incluidos

### Por defecto incluye:
- **📝 Hacer bullets**: Resumen en 3 puntos del contenido
- **🧵 Escribir hilo**: Hilo de Twitter/X del artículo
- **🚫 Generar desmentido**: Borrador de fact-checking
- **📰 Generar titular**: 3 opciones de titulares alternativos
- **🎬 Guión para video**: Script para video explicativo

### Personalización completa:
- Crea tus propias tareas
- Configura prompts específicos para tu flujo de trabajo
- Importa tareas de otros usuarios o equipos

## 🔐 Privacidad y Seguridad

- **API Key local**: Tu clave se almacena solo en tu navegador
- **Sin servidores intermediarios**: Conexión directa con OpenAI
- **Datos temporales**: Las ejecuciones se almacenan solo en memoria
- **Sin tracking**: No recopilamos datos de uso

## 💰 Costos

Esta versión usa tu cuenta de OpenAI directamente:
- **Control total** sobre el gasto
- **Tarifas transparentes** según el modelo usado
- **Sin suscripciones** adicionales
- **Pay-per-use** - pagas solo lo que usas

### Estimación de costos (GPT-5):
- Artículo corto (1000 palabras): ~$0.010 por pedido
- Artículo largo (3000 palabras): ~$0.016 por pedido
- Con archivos adjuntos: +$0.003-0.008 adicional por archivo