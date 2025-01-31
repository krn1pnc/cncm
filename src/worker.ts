import aesjs from "aes-js";
import * as b64js from "base64-js";

class NcmAes {
  aes: aesjs.ModeOfOperation.ModeOfOperationECB;

  constructor(key: Uint8Array) {
    this.aes = new aesjs.ModeOfOperation.ecb(key);
  }

  decrypt(ciphertext: Uint8Array): Uint8Array {
    return aesjs.padding.pkcs7.strip(this.aes.decrypt(ciphertext));
  }
}

class NcmRc4 {
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

class StreamReader {
  data: Uint8Array;
  pos: number;

  constructor(data: Uint8Array) {
    this.data = data;
    this.pos = 0;
  }

  read(n?: number | undefined): Uint8Array {
    if (n == undefined) {
      let res = this.data.subarray(this.pos);
      this.pos = this.data.length;
      return res;
    } else {
      let res = this.data.subarray(this.pos, this.pos + n);
      this.pos += n;
      return res;
    }
  }

  seek(n: number) {
    this.pos += n;
  }
}

function getUint32LE(a: Uint8Array): number {
  return (a[3] << 24) | (a[2] << 16) | (a[1] << 8) | a[0];
}

const enc = new TextEncoder();
const dec = new TextDecoder();

const rc4KeyCrypto = new NcmAes(enc.encode("hzHRAmso5kInbaxW"));
const metaCrypto = new NcmAes(enc.encode("#14ljk_!\\]&0U<'("));

onmessage = async (e) => {
  let f = new StreamReader(await e.data.bytes());

  let magic = f.read(8);
  if (dec.decode(magic) != "CTENFDAM") {
    throw TypeError("Not a valid NCM file.");
  }

  f.seek(2);

  let rc4KeyLen = getUint32LE(f.read(4));
  let rc4KeyCipher = f.read(rc4KeyLen).map((x) => x ^ 0x64);
  let rc4Key = rc4KeyCrypto.decrypt(rc4KeyCipher).slice(17);

  let metaSectionLen = getUint32LE(f.read(4));
  let metaSection = f.read(metaSectionLen).map((x) => x ^ 0x63);
  let metaCipher = b64js.toByteArray(dec.decode(metaSection.slice(22)));
  let meta = JSON.parse(dec.decode(metaCrypto.decrypt(metaCipher).slice(6)));

  f.seek(4);

  f.seek(5);

  let coverLen = getUint32LE(f.read(4));
  let cover = f.read(coverLen);
  if (coverLen == 0) {
    cover = await fetch(meta.albumPic)
      .then((resp) => resp.arrayBuffer())
      .then((buffer) => new Uint8Array(buffer));
  }

  let rc4Crypto = new NcmRc4(rc4Key);
  let musicCipher = f.read();
  let music = rc4Crypto.decrypt(musicCipher);

  postMessage(
    {
      format: meta.format,
      cover: cover,
      music: music,
    },
    [cover.buffer, music.buffer],
  );

  close();
};
