/**
 * cleanup-js-tiktoken.js
 * The project uses js-tiktoken to cut down text to avoid exceeding LLM's context length.
 * However, js-tiktoken has all encodings hard-coded into its code (node_modules/js-tiktoken/dist/index.cjs and node_modules/js-tiktoken/dist/index.js),
 * which makes the build output quite large.
 * 
 * I've analyzed the import dependencies and found that the
 * `@tavily/core` SDK also uses js-tiktoken. So basically 
 * only `cl100k_base` (for tavily) and `o200k_base` (for our project) are needed.
 * 
 * So I wrote this script to clean up unused js-tiktoken encodings in the build output,
 * making the build output smaller by about 2 MB.
 */

import fs from 'fs';

const filePaths = ['node_modules/js-tiktoken/dist/index.cjs', 'node_modules/js-tiktoken/dist/index.js'];

for (const filePath of filePaths) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');

    // 保留 cl100k_base 和 o200k_base，清空其他编码器
    const patterns = [
      ['gpt2_default', 'var gpt2_default = { "explicit_n_vocab": 50257, "pat_str":', 'var gpt2_default = {}'],
      ['p50k_base_default', 'var p50k_base_default = { "explicit_n_vocab":', 'var p50k_base_default = {}'],
      ['p50k_edit_default', 'var p50k_edit_default = { "pat_str":', 'var p50k_edit_default = {}'],
      ['r50k_base_default', 'var r50k_base_default = { "explicit_n_vocab":', 'var r50k_base_default = {}'],
    ];

    for (const [name, searchStr, replaceStr] of patterns) {
      const startIdx = content.indexOf(searchStr);
      if (startIdx === -1) continue;

      // 找到变量定义的结束位置
      const endIdx = content.indexOf('\n', startIdx);
      if (endIdx === -1) continue;

      // 替换整个变量定义
      content = content.slice(0, startIdx) + replaceStr + content.slice(endIdx);
    }

    // 写回文件
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Successfully cleaned up js-tiktoken encodings in ${filePath}`);
  }
}