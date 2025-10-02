// Mickey 1.0 驗證 (for RLC)
const R_Mask = [0x1d5363d5, 0x415a0aac, 0x0000d2a8];
const Comp0   = [0x6aa97a30, 0x7942a809, 0x00003fea];
const Comp1   = [0xdd629e9a, 0xe3a21d63, 0x00003dd7];
const S_Mask0 = [0x9ffa7faf, 0xaf4a9381, 0x00005802];
const S_Mask1 = [0x4c8cb877, 0x4911b063, 0x0000c52b];

export function sign({ uid, ts }) {
  const prefix = "FFFFFF";
  const rawKey = Buffer.from(prefix + uid, "hex");
  const rawIv = Buffer.from(ts, "hex");

  let key = [];
  let iv = [];
  let keystream = [];
  let key_size = 80;
  let iv_size = 32;
  let keystream_size = 4;
  let R = [0, 0, 0];
  let S = [0, 0, 0];

  function CLOCK_R(input_bit, control_bit) {
    let Feedback_bit = ((R[2] >>> 15) & 1) ^ input_bit;
    let Carry0 = (R[0] >>> 31) & 1;
    let Carry1 = (R[1] >>> 31) & 1;
    if (control_bit) {
      R[0] ^= R[0] << 1;
      R[1] ^= (R[1] << 1) ^ Carry0;
      R[2] ^= (R[2] << 1) ^ Carry1;
    } else {
      R[0] = R[0] << 1;
      R[1] = (R[1] << 1) ^ Carry0;
      R[2] = (R[2] << 1) ^ Carry1;
    }
    if (Feedback_bit) {
      R[0] ^= R_Mask[0];
      R[1] ^= R_Mask[1];
      R[2] ^= R_Mask[2];
    }
  }

  function CLOCK_S(input_bit, control_bit) {
    let Feedback_bit = ((S[2] >>> 15) & 1) ^ input_bit;
    let Carry0 = (S[0] >>> 31) & 1;
    let Carry1 = (S[1] >>> 31) & 1;

    S[0] =
      (S[0] << 1) ^
      ((S[0] ^ Comp0[0]) &
        ((S[0] >>> 1) ^ (S[1] << 31) ^ Comp1[0]) &
        0xfffffffe);
    S[1] =
      (S[1] << 1) ^
      ((S[1] ^ Comp0[1]) & ((S[1] >>> 1) ^ (S[2] << 31) ^ Comp1[1])) ^
      Carry0;
    S[2] =
      (S[2] << 1) ^
      ((S[2] ^ Comp0[2]) & ((S[2] >>> 1) ^ Comp1[2]) & 0x7fff) ^
      Carry1;

    if (Feedback_bit) {
      if (control_bit) {
        S[0] ^= S_Mask1[0];
        S[1] ^= S_Mask1[1];
        S[2] ^= S_Mask1[2];
      } else {
        S[0] ^= S_Mask0[0];
        S[1] ^= S_Mask0[1];
        S[2] ^= S_Mask0[2];
      }
    }
  }

  function CLOCK_KG(mixing, input_bit) {
    let Keystream_bit = (R[0] ^ S[0]) & 1;
    let control_bit_r = ((S[0] >>> 27) ^ (R[1] >>> 21)) & 1;
    let control_bit_s = ((S[1] >>> 21) ^ (R[0] >>> 26)) & 1;
    if (mixing) {
      CLOCK_R(((S[1] >>> 8) & 1) ^ input_bit, control_bit_r);
    } else {
      CLOCK_R(input_bit, control_bit_r);
    }
    CLOCK_S(input_bit, control_bit_s);
    return Keystream_bit;
  }

  function reverse_bit(x) {
    x = ((x & 0xaa) >>> 1) | ((x & 0x55) << 1);
    x = ((x & 0xcc) >>> 2) | ((x & 0x33) << 2);
    return (x >>> 4) | (x << 4);
  }

  function iv_setup({ rawKey, rawIv }) {
    for (let i = 0; i < Math.floor(key_size / 8); i++) {
      key[i] = reverse_bit(rawKey[9 - i]);
    }
    for (let i = 0; i < Math.floor(iv_size / 8); i++) {
      iv[i] = reverse_bit(rawIv[3 - i]);
    }
    for (let i = 0; i < iv_size; i++) {
      let bit = (iv[Math.floor(i / 8)] >>> (7 - (i % 8))) & 1;
      CLOCK_KG(1, bit);
    }
    for (let i = 0; i < key_size; i++) {
      let bit = (key[Math.floor(i / 8)] >>> (7 - (i % 8))) & 1;
      CLOCK_KG(1, bit);
    }
    for (let i = 0; i < key_size; i++) CLOCK_KG(1, 0);
  }

  function keystream_byte(len) {
    for (let i = 0; i < len; i++) {
      keystream[i] = 0;
      for (let j = 0; j < 8; j++) {
        keystream[i] ^= CLOCK_KG(0, 0) << (7 - j);
      }
    }
  }

  iv_setup({ rawKey, rawIv });
  keystream_byte(keystream_size);

  return keystream.map(c => ("00" + c.toString(16)).slice(-2)).join("").toUpperCase();
}
