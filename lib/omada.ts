import axios from 'axios';

// Configuración de Omada Controller
const OMADA_URL = process.env.OMADA_CONTROLLER_URL || 'https://your-omada-controller.com';
const OMADA_USERNAME = process.env.OMADA_USERNAME || 'admin';
const OMADA_PASSWORD = process.env.OMADA_PASSWORD || 'password';
const OMADA_SITE_ID = process.env.OMADA_SITE_ID || 'default';

interface OmadaAuthResponse {
  token: string;
}

// Autenticar con Omada Controller
async function getOmadaToken(): Promise<string> {
  try {
    const response = await axios.post(
      `${OMADA_URL}/api/v2/login`,
      {
        username: OMADA_USERNAME,
        password: OMADA_PASSWORD
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.result.token;
  } catch (error) {
    console.error('Error al autenticar con Omada:', error);
    throw new Error('No se pudo autenticar con Omada Controller');
  }
}

// Autorizar cliente en el portal cautivo
export async function authorizeClient(mac: string, duration: number = 604800): Promise<boolean> {
  try {
    const token = await getOmadaToken();
    
    const response = await axios.post(
      `${OMADA_URL}/api/v2/sites/${OMADA_SITE_ID}/cmd/authorize-guest`,
      {
        mac: mac,
        duration: duration, // duración en segundos (7 días = 604800)
        voucher: false,
        wirelessAuth: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Csrf-Token': token
        }
      }
    );
    
    return response.data.errorCode === 0;
  } catch (error) {
    console.error('Error al autorizar cliente:', error);
    return false;
  }
}

// Desautorizar cliente
export async function unauthorizeClient(mac: string): Promise<boolean> {
  try {
    const token = await getOmadaToken();
    
    const response = await axios.post(
      `${OMADA_URL}/api/v2/sites/${OMADA_SITE_ID}/cmd/unauthorize-guest`,
      {
        mac: mac
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Csrf-Token': token
        }
      }
    );
    
    return response.data.errorCode === 0;
  } catch (error) {
    console.error('Error al desautorizar cliente:', error);
    return false;
  }
}

// Obtener información del cliente
export async function getClientInfo(mac: string) {
  try {
    const token = await getOmadaToken();
    
    const response = await axios.get(
      `${OMADA_URL}/api/v2/sites/${OMADA_SITE_ID}/clients/${mac}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Csrf-Token': token
        }
      }
    );
    
    return response.data.result;
  } catch (error) {
    console.error('Error al obtener info del cliente:', error);
    return null;
  }
}
