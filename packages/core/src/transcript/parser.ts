import { readFileSync } from 'node:fs';
import { calculateCost, normalizeModelId } from '../models/pricing.js';

/**
 * A single entry from a Claude Code transcript JSONL file.
 */
export interface TranscriptEntry {
  parentUuid?: string;
  isSidechain?: boolean;
  message: {
    role: 'user' | 'assistant';
    model?: string;
    type?: string;
    content?: Array<{
      type: string;
      text?: string;
      name?: string;
      input?: Record<string, unknown>;
      id?: string;
    }>;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      server_tool_use?: {
        web_search_requests?: number;
        web_fetch_requests?: number;
      };
    };
    stop_reason?: string;
  };
}

/**
 * Parsed usage data from a transcript entry.
 */
export interface TranscriptUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  model: string;
  totalTokens: number;
}

/**
 * Summary of an assistant response from transcript.
 */
export interface TranscriptResponse {
  responseText: string;       // concatenated text blocks
  toolCalls: string[];        // tool names called
  usage: TranscriptUsage;
  stopReason: string | null;
}

/**
 * Full session summary from transcript.
 */
export interface TranscriptSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
  model: string;
  turns: number;              // count of user messages
  responses: TranscriptResponse[];
  totalCostUsd: number;
}

function calculateExactCost(usage: TranscriptUsage): number {
  return calculateCost(
    usage.inputTokens,
    usage.outputTokens,
    usage.model,
    usage.cacheReadTokens,
    usage.cacheWriteTokens
  );
}

/**
 * Read the last N lines of a JSONL file efficiently.
 */
function readLastLines(filePath: string, count: number): string[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    return lines.slice(-count);
  } catch {
    return [];
  }
}

/**
 * Parse a single JSONL line into a TranscriptEntry.
 */
function parseLine(line: string): TranscriptEntry | null {
  try {
    return JSON.parse(line) as TranscriptEntry;
  } catch {
    return null;
  }
}

/**
 * Get the latest assistant response from a transcript file.
 * Reads from the end of the file for efficiency.
 */
export function getLatestResponse(transcriptPath: string): TranscriptResponse | null {
  const lines = readLastLines(transcriptPath, 20);

  // Find the last assistant message with usage data
  for (let i = lines.length - 1; i >= 0; i--) {
    const entry = parseLine(lines[i]);
    if (!entry?.message) continue;

    const msg = entry.message;
    if (msg.role === 'assistant' && msg.usage?.output_tokens) {
      const responseText = (msg.content ?? [])
        .filter(c => c.type === 'text' && c.text)
        .map(c => c.text!)
        .join('\n');

      const toolCalls = (msg.content ?? [])
        .filter(c => c.type === 'tool_use' && c.name)
        .map(c => c.name!);

      const usage: TranscriptUsage = {
        inputTokens: msg.usage.input_tokens ?? 0,
        outputTokens: msg.usage.output_tokens ?? 0,
        cacheReadTokens: msg.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: msg.usage.cache_creation_input_tokens ?? 0,
        model: normalizeModelId(msg.model ?? 'unknown'),
        totalTokens: (msg.usage.input_tokens ?? 0) + (msg.usage.output_tokens ?? 0) +
                     (msg.usage.cache_read_input_tokens ?? 0) + (msg.usage.cache_creation_input_tokens ?? 0),
      };

      return {
        responseText,
        toolCalls,
        usage,
        stopReason: msg.stop_reason ?? null,
      };
    }
  }

  return null;
}

/**
 * Get full session summary from a transcript file.
 * Reads the entire file and aggregates all assistant responses.
 */
export function getSessionSummary(transcriptPath: string): TranscriptSummary | null {
  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheReadTokens = 0;
    let totalCacheWriteTokens = 0;
    let model = 'unknown';
    let userMessageCount = 0;
    const responses: TranscriptResponse[] = [];

    for (const line of lines) {
      const entry = parseLine(line);
      if (!entry?.message) continue;

      const msg = entry.message;

      if (msg.role === 'user') {
        // Only count real user prompts, not tool_result messages
        const content = msg.content;
        const isToolResult = Array.isArray(content) && content.length > 0 && content[0]?.type === 'tool_result';
        if (!isToolResult) {
          userMessageCount++;
        }
      }

      if (msg.role === 'assistant' && msg.usage) {
        const inputTokens = msg.usage.input_tokens ?? 0;
        const outputTokens = msg.usage.output_tokens ?? 0;
        const cacheRead = msg.usage.cache_read_input_tokens ?? 0;
        const cacheWrite = msg.usage.cache_creation_input_tokens ?? 0;

        totalInputTokens += inputTokens;
        totalOutputTokens += outputTokens;
        totalCacheReadTokens += cacheRead;
        totalCacheWriteTokens += cacheWrite;

        if (msg.model) model = normalizeModelId(msg.model);

        const responseText = (msg.content ?? [])
          .filter(c => c.type === 'text' && c.text)
          .map(c => c.text!)
          .join('\n');

        const toolCalls = (msg.content ?? [])
          .filter(c => c.type === 'tool_use' && c.name)
          .map(c => c.name!);

        const usage: TranscriptUsage = {
          inputTokens, outputTokens, cacheReadTokens: cacheRead,
          cacheWriteTokens: cacheWrite, model: normalizeModelId(msg.model ?? model),
          totalTokens: inputTokens + outputTokens + cacheRead + cacheWrite,
        };

        responses.push({ responseText, toolCalls, usage, stopReason: msg.stop_reason ?? null });
      }
    }

    const summaryUsage: TranscriptUsage = {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cacheReadTokens: totalCacheReadTokens,
      cacheWriteTokens: totalCacheWriteTokens,
      model,
      totalTokens: totalInputTokens + totalOutputTokens + totalCacheReadTokens + totalCacheWriteTokens,
    };

    return {
      totalInputTokens,
      totalOutputTokens,
      totalCacheReadTokens,
      totalCacheWriteTokens,
      model,
      turns: userMessageCount,
      responses,
      totalCostUsd: calculateExactCost(summaryUsage),
    };
  } catch {
    return null;
  }
}
