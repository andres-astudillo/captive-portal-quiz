# Portal Cautivo con Quiz - Auditorio Alameda

Sistema de portal cautivo interactivo que requiere responder correctamente un quiz para acceder a WiFi. Incluye panel de administración para gestionar preguntas y ver estadísticas.

## 🚀 Características

- ✅ Quiz aleatorio de 5 preguntas
- ✅ Requiere mínimo 3 respuestas correctas para acceder
- ✅ Recopilación de datos: nombre, email, teléfono
- ✅ Sesión WiFi de 7 días
- ✅ Panel de administración completo
- ✅ Gestión de preguntas (agregar, editar, eliminar)
- ✅ Estadísticas en tiempo real
- ✅ Exportar usuarios a CSV
- ✅ Integración con Omada Controller
- ✅ Base de datos Vercel KV (Redis)

## 📋 Requisitos Previos

- Cuenta en Vercel
- Controlador Omada (físico o cloud)
- Node.js 18+ (solo para desarrollo local)

## 🔧 Instalación

### 1. Clonar el proyecto

```bash
git clone <tu-repositorio>
cd captive-portal-quiz
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Vercel KV

1. Ve a tu proyecto en Vercel
2. Storage → Create Database → KV
3. Copia las variables de entorno que te proporciona Vercel

### 4. Configurar variables de entorno

Crea un archivo `.env.local` basándote en `.env.example`:

```env
# Vercel KV (copia desde Vercel Dashboard)
KV_REST_API_URL=https://your-kv-url.upstash.io
KV_REST_API_TOKEN=your_token
KV_REST_API_READ_ONLY_TOKEN=your_read_only_token
KV_URL=redis://default:your_password@your-kv-url.upstash.io:6379

# Omada Controller
OMADA_CONTROLLER_URL=https://192.168.1.100:8043
OMADA_USERNAME=admin
OMADA_PASSWORD=tu_password_omada
OMADA_SITE_ID=default
```

### 5. Desarrollo local

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 🌐 Deploy en Vercel

### Opción 1: Deploy desde CLI

```bash
npm install -g vercel
vercel login
vercel
```

### Opción 2: Deploy desde GitHub

1. Sube tu código a GitHub
2. Importa el repositorio en Vercel
3. Configura las variables de entorno en Vercel Dashboard
4. Deploy automático

### Variables de entorno en Vercel

En tu proyecto de Vercel, ve a **Settings → Environment Variables** y agrega:

```
KV_REST_API_URL
KV_REST_API_TOKEN
KV_REST_API_READ_ONLY_TOKEN
KV_URL
OMADA_CONTROLLER_URL
OMADA_USERNAME
OMADA_PASSWORD
OMADA_SITE_ID
```

## ⚙️ Configuración de Omada Controller

### 1. Configurar External Portal Server

En Omada Controller:

1. **Settings → Authentication → Portal**
2. Selecciona tu SSID de invitados
3. **Edit Portal**
4. **Authentication Type:** External Portal Server
5. **Portal URL:** `https://tu-dominio.vercel.app?mac={client-mac}&ssid={ssid}&ap={ap-mac}`
6. **Authentication Timeout:** 60 segundos
7. Guarda y aplica

### 2. Parámetros URL

Omada enviará estos parámetros automáticamente:
- `mac`: MAC del dispositivo cliente
- `ssid`: Nombre de la red WiFi
- `ap`: MAC del Access Point

El sistema los captura automáticamente.

## 📊 Panel de Administración

Accede al panel admin en:
```
https://tu-dominio.vercel.app/admin
```

### Funcionalidades:

**Estadísticas:**
- Total de usuarios
- Usuarios activos
- Promedio de respuestas correctas
- Promedio de intentos

**Usuarios Conectados:**
- Lista completa con datos
- Exportar a CSV
- Fecha de conexión y expiración
- Score del quiz

**Gestión de Preguntas:**
- Ver todas las preguntas
- Agregar nuevas preguntas
- Editar preguntas existentes
- Eliminar preguntas
- Categorías: Cultura General, Mendoza, Tecnología, Música, Cine, Deportes, Historia, Ciencia

## 🎯 Flujo de Usuario

1. Usuario se conecta al WiFi
2. Es redirigido al portal cautivo
3. Completa formulario (nombre, email, teléfono)
4. Responde 5 preguntas aleatorias
5. Si acierta 3 o más → acceso por 7 días
6. Si falla → puede reintentar inmediatamente

## 🔒 Seguridad

- Las respuestas correctas nunca se envían al cliente
- Validación en backend
- Integración segura con Omada API
- Variables de entorno protegidas

## 📝 Personalización

### Cambiar colores

Edita `tailwind.config.js`:

```js
theme: {
  extend: {
    colors: {
      primary: '#10b981',  // Verde actual
      'primary-dark': '#059669',
    }
  },
}
```

### Cambiar requisitos del quiz

En `app/api/submit/route.ts`:

```typescript
// Cambiar de 3 a otro número
const passed = correctCount >= 3;
```

### Cambiar duración de sesión

En `app/api/submit/route.ts`:

```typescript
// Cambiar de 7 días a otro período
const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
await authorizeClient(mac, 7 * 24 * 60 * 60); // segundos
```

### Agregar más preguntas

Edita `lib/db.ts` en el array `defaultQuestions` o usa el panel admin.

## 🐛 Troubleshooting

### No se autoriza en Omada

1. Verifica que las credenciales en `.env` sean correctas
2. Verifica que la URL del controlador sea accesible
3. Revisa que el SITE_ID sea correcto (normalmente es "default")
4. Verifica los logs en Vercel

### Las preguntas no se guardan

1. Verifica que Vercel KV esté configurado correctamente
2. Revisa las variables de entorno KV en Vercel
3. Verifica que la base de datos KV esté activa

### Error de CORS

Si el portal no carga:
1. Verifica que la URL en Omada sea exacta
2. Asegúrate de incluir los parámetros `?mac={client-mac}&ssid={ssid}&ap={ap-mac}`

## 📞 Soporte

Para problemas o preguntas, abre un issue en el repositorio.

## 📄 Licencia

MIT License - Libre de usar y modificar.

---

Desarrollado para Auditorio Alameda 🎭
