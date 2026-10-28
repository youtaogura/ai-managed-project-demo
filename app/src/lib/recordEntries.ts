import type { MemoEntry, PostReadMemo, QuoteEntry, SpineColor } from '../types/record';
import { SPINE_COLORS } from './constants';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}

export function isQuoteEntry(value: unknown): value is QuoteEntry {
  return (
    isObject(value) &&
    isNonEmptyString(value.id) &&
    typeof value.text === 'string' &&
    isNullableString(value.page) &&
    isNullableString(value.comment) &&
    typeof value.createdAt === 'string'
  );
}

export function isMemoEntry(value: unknown): value is MemoEntry {
  return (
    isObject(value) &&
    isNonEmptyString(value.id) &&
    typeof value.text === 'string' &&
    isNullableString(value.page) &&
    typeof value.createdAt === 'string'
  );
}

export function isPostReadMemo(value: unknown): value is PostReadMemo {
  return (
    isObject(value) &&
    isNonEmptyString(value.id) &&
    typeof value.text === 'string' &&
    typeof value.createdAt === 'string'
  );
}

export function isSpineColor(value: unknown): value is SpineColor {
  return typeof value === 'string' && (SPINE_COLORS as readonly string[]).includes(value);
}

export function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

export function isStringArray(value: unknown): value is string[] {
  return isArrayOf(value, (item): item is string => typeof item === 'string');
}
