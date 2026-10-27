import type { Server } from 'node:http';

export function resolveRequestPath(distDir: string, urlPath: string): string;
export function createStaticServer(distDir: string): Server;
