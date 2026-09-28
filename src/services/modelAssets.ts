// Native resource names; the config plugin embeds weights without routing them through Metro.
export const modelAssets = {
  encoder: 'encoder.onnx', head: 'head.onnx',
  tokenizer: 'tokenizer.layajson', config: 'config.layajson',
} as const;
