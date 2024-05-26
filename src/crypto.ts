import aesjs from "aes-js";

export class NcmAes {
  aes: aesjs.ModeOfOperation.ModeOfOperationECB;

  constructor(key: Uint8Array) {
    this.aes = new aesjs.ModeOfOperation.ecb(key);
  }

  decrypt(ciphertext: Uint8Array): Uint8Array {
    return aesjs.padding.pkcs7.strip(this.aes.decrypt(ciphertext));
  }
}

export class NcmRc4 {
  keyBox: Uint8Array;

  constructor(key: Uint8Array) {
    let keyLen = key.byteLength;
    let sBox = new Uint8Array(256);
    this.keyBox = new Uint8Array(256);

    for (let i = 0; i < 256; i++) sBox[i] = i;
    for (let i = 0, j = 0; i < 256; i++) {
      j = (j + sBox[i] + key[i % keyLen]) % 256;
      [sBox[i], sBox[j]] = [sBox[j], sBox[i]];
    }
    for (let i = 0; i < 256; i++) {
      let j = (i + 1) % 256;
      let x = sBox[j];
      let y = sBox[(j + x) % 256];
      this.keyBox[i] = sBox[(x + y) % 256];
    }
  }

  decrypt(ciphertext: Uint8Array): Uint8Array {
    let len = ciphertext.byteLength;
    let plaintext = new Uint8Array(len);
    for (let i = 0, keyPos = 0; i < len; i++, keyPos = (keyPos + 1) % 256) {
      plaintext[i] = ciphertext[i] ^ this.keyBox[keyPos];
    }
    return plaintext;
  }
}
