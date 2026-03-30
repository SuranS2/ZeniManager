import CryptoJS from 'crypto-js';

// .env에 정의된 키를 가져옵니다. (기본값 설정은 테스트용이며 실제 운영 시에는 .env 필수)
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'zeniel-default-secret-key-2024';

/**
 * 평문 텍스트를 AES-256 방식으로 암호화합니다.
 */
export const encrypt = (text: string): string => {
  if (!text) return '';
  try {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption Error:', error);
    return text; // 실패 시 평문 반환 (주의)
  }
};

/**
 * 암호화된 텍스트를 복호화하여 평문으로 반환합니다.
 */
export const decrypt = (cipherText: string): string => {
  if (!cipherText) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption Error:', error);
    return cipherText; // 실패 시 암호화된 텍스트 그대로 반환
  }
};
