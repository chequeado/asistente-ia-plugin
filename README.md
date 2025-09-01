# Asistente IA 

**Asistente con IA para periodistas y chequeadores**

Extensión de navegador desarrollado para organizaciones orientadas al periodismo y fact-checking que resuelve tareas clave del trabajo diario de periodistas de forma automática utilizando Inteligencia Artificial. Está especialmente diseñado para organizaciones que buscan acelerar su proceso de adopción de IA en redacciones y otras áreas. Cuenta con una serie de tareas precargadas, 100% personalizables y la posibilidad de agregar nuevas tareas de forma rápida y sencilla. 

Para ver más prompts (disponibles en español, portugués e inglés), se puede acceder a la [base regional de prompts](https://github.com/chequeado/asistente-ia-plugin/wiki). Esta versión local funciona conectándose directamente con la API de OpenAI. Incluye todas las funcionalidades principales del asistente, incluyendo gestión y personalización de tareas. Requiere una clave de API de OpenAI para ejecutar las tareas de IA. 

Esta extensión fue desarrollada en el marco del proyecto de JournalismAI Innovation Challenge *"Empoderando redacciones pequeñas con Inteligencia Artificial"*, de [Chequeado](https://chequeado.com)

Agradecemos el aporte de [La Silla Vacía](https://lasillavacia.com) (Colombia), [Projecto Comprova](https://projetocomprova.com.br/) (Brasil) y [Factchequeado](https://factchequeado.com) (Estados Unidos) como usuarios de prueba que aportaron valioso feedback para el desarrollo de este proyecto y también por las instrucciones que aportaron a la base regional. 
 
<img width="600" height="444" alt="Captura de pantalla de 2025-09-01 18-39-12" src="https://github.com/user-attachments/assets/f3dc89b6-8088-4b10-8428-c56df9c7684f" style="border: 2px solid gray; border-radius: 5px;" />


## 🌟 Características

- ✅ **Gestión local de tareas** - Crea, edita y personaliza tareas
- ✅ **Importar/Exportar configuraciones** - Comparte tareas entre dispositivos
- ✅ **Soporte para archivos adjuntos** - PDFs, documentos, etc.
- ✅ **Refinamiento de resultados** - Mejora las respuestas iterativamente

## 🚀 Instalación

### 1. Descargar el código
```bash
git clone https://github.com/chequeado/asistente-ia-plugin.git
cd asistente-ia-plugin
```

### 2. Instalar la extensión
1. Abre Chrome y navega a `chrome://extensions/`
2. Activa el "Modo desarrollador" en la esquina superior derecha
3. Haz clic en "Cargar descomprimida" y selecciona la carpeta `extension`
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

## 🔐 Privacidad y Seguridad

- **API Key local**: Tu clave se almacena solo en tu navegador
- **Sin servidores intermediarios**: Conexión directa con OpenAI
- **Datos temporales**: Las ejecuciones se almacenan solo en memoria
- **Sin tracking**: No se recopilan datos de uso

### Estimación de costos (GPT-5):
- Artículo corto (1000 palabras): ~$0.010 por pedido
- Artículo largo (3000 palabras): ~$0.016 por pedido
- Con archivos adjuntos: +$0.003-0.008 adicional por archivo
