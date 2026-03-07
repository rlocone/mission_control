/**
 * Input validation utilities for API security
 */

import { NextResponse } from 'next/server';

// Maximum limits for pagination
export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 20;
export const MAX_EXPORT_LIMIT = 5000;

/**
 * Safely parse and bound an integer parameter
 */
export function parseIntBounded(
  value: string | null,
  defaultVal: number,
  min: number,
  max: number
): number {
  if (!value) return defaultVal;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultVal;
  return Math.max(min, Math.min(max, parsed));
}

/**
 * Validate ID format (UUID or prefixed UUID like "agent-name-uuid")
 */
export function isValidUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  // Standard UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  // Prefixed UUID format (e.g., "sarah-92f3302a-5e93-4e94-ac7e-4202b747337c")
  const prefixedUuidRegex = /^[a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  // Simple alphanumeric ID with dashes
  const simpleIdRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,100}$/;
  
  return uuidRegex.test(str) || prefixedUuidRegex.test(str) || simpleIdRegex.test(str);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate array of UUIDs
 */
export function isValidUUIDArray(arr: unknown): arr is string[] {
  if (!Array.isArray(arr)) return false;
  if (arr.length === 0 || arr.length > 50) return false; // Max 50 items
  return arr.every(item => typeof item === 'string' && isValidUUID(item));
}

/**
 * Sanitize string input to prevent injection
 */
export function sanitizeString(str: string | null | undefined, maxLength: number = 1000): string {
  if (!str) return '';
  // Remove null bytes and control characters except newlines and tabs
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .slice(0, maxLength)
    .trim();
}

/**
 * Validate date string
 */
export function isValidDateString(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && dateStr.length <= 50;
}

/**
 * Create error response with consistent format
 */
export function validationError(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Validate incident type enum
 */
export function isValidIncidentType(type: string | null | undefined): boolean {
  const validTypes = [
    'TASK_LIMIT_EXCEEDED',
    'RUN_LIMIT_EXCEEDED', 
    'DAILY_LIMIT_EXCEEDED',
    'BURN_RATE_EXCEEDED'
  ];
  return !!type && validTypes.includes(type);
}

/**
 * Validate log level enum
 */
export function isValidLogLevel(level: string | null | undefined): boolean {
  const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
  return !level || validLevels.includes(level.toUpperCase());
}

/**
 * Validate task status enum
 */
export function isValidTaskStatus(status: string | null | undefined): boolean {
  const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'];
  return !status || validStatuses.includes(status.toUpperCase());
}
