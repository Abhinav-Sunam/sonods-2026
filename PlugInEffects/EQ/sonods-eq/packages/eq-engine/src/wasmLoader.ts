import { DspExports } from './types.js';
import { getWasmBytes } from './wasm/wasmBinary.js';

export async function loadDspModule(wasmBytes?: ArrayBuffer | Uint8Array): Promise<DspExports> {
  const bytes = wasmBytes || getWasmBytes();
  const { instance } = await WebAssembly.instantiate(bytes, {});
  return instance.exports as unknown as DspExports;
}
