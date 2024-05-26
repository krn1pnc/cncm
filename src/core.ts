import { NcmAes, NcmRc4 } from "./crypto";
import * as base64js from "base64-js";

export class Ncm {
  format: "mp3" | "flac";
  cover: Uint8Array;
  music: Uint8Array;

  constructor(format: "mp3" | "flac", cover: Uint8Array, music: Uint8Array) {
    this.format = format;
    this.cover = cover;
    this.music = music;
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
      if (this.pos >= this.data.length) {
        throw new RangeError("Reached end of data.");
      }
      let res = this.data.subarray(this.pos);
      this.pos = this.data.length;
      return res;
    } else {
      if (this.pos + n > this.data.length) {
        throw new RangeError("Reached end of data.");
      }
      let res = this.data.subarray(this.pos, this.pos + n);
      this.pos += n;
      return res;
    }
  }

  seek(n: number) {
    if (this.pos + n > this.data.length) {
      throw new RangeError("Reached end of data.");
    }
    this.pos += n;
  }
}

const rc4KeyCrypto = new NcmAes(
  new Uint8Array([0x68, 0x7a, 0x48, 0x52, 0x41, 0x6d, 0x73, 0x6f, 0x35, 0x6b, 0x49, 0x6e, 0x62, 0x61, 0x78, 0x57])
);

const metadataCrypto = new NcmAes(
  new Uint8Array([0x23, 0x31, 0x34, 0x6c, 0x6a, 0x6b, 0x5f, 0x21, 0x5c, 0x5d, 0x26, 0x30, 0x55, 0x3c, 0x27, 0x28])
);

export async function decrypt(file: Uint8Array): Promise<Ncm> {
  let reader = new StreamReader(file);
  let decoder = new TextDecoder();
  let getUint32 = (a: Uint8Array) => (a[3] << 24) | (a[2] << 16) | (a[1] << 8) | a[0];

  let magic = reader.read(8);
  if (decoder.decode(magic) != "CTENFDAM") {
    throw TypeError("Not a valid NCM file.");
  }

  reader.seek(2);

  let rc4KeyLen = getUint32(reader.read(4));
  let rc4KeyCipher = reader.read(rc4KeyLen).map((x) => x ^ 0x64);
  let rc4Key = rc4KeyCrypto.decrypt(rc4KeyCipher).slice("neteasecloudmusic".length);

  let metadataLen = getUint32(reader.read(4));
  let metadataCipher = base64js.toByteArray(
    decoder.decode(
      reader
        .read(metadataLen)
        .map((x) => x ^ 0x63)
        .slice("163 key(Don't modify):".length)
    )
  );
  let metadata = JSON.parse(decoder.decode(metadataCrypto.decrypt(metadataCipher).slice("music:".length)));

  reader.seek(4);

  reader.seek(5);

  let coverLen = getUint32(reader.read(4));
  let cover = reader.read(coverLen);
  if (coverLen == 0) {
    cover = await fetch(metadata.albumPic)
      .then((resp) => resp.arrayBuffer())
      .then((buffer) => new Uint8Array(buffer));
  }

  let rc4Crypto = new NcmRc4(rc4Key);
  let musicCipher = reader.read();
  let music = rc4Crypto.decrypt(musicCipher);

  return new Ncm(metadata.format, cover, music);
}
