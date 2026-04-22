// ⚠️ URL WEB APP GOOGLE SCRIPT ANDA (Sudah saya sesuaikan dengan milik Anda)
const API_URL = "https://script.google.com/macros/s/AKfycbyPY0tHt5br1mITLCihtukRX4Qjn39IhWg7rDi4gxeIk2UeyNGh0zXDA3ROs2mcvhkm/exec";

async function callAPI(action, args = []) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow', // Penting agar lolos keamanan redirect Google
      body: JSON.stringify({ action: action, args: args })
    });
    
    const textResponse = await response.text();
    
    try {
      return JSON.parse(textResponse);
    } catch (parseError) {
      console.error("Format server salah:", textResponse);
      return { status: 'error', message: 'Tolong pastikan Deploy as New Version di Google Script sudah dilakukan.' };
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    return { status: 'error', message: 'Gagal terhubung ke server. Periksa koneksi internet.' };
  }
}
